import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReviewEngine } from '../../src/ai/review-engine.js';
import type { ReviewConfig } from '../../src/ai/review-engine.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const VALID_JSON_RESPONSE = {
  summary: 'Architecture looks good',
  score: 85,
  recommendations: [
    {
      category: 'security',
      severity: 'warning',
      message: 'Use env vars for secrets',
      affectedComponents: ['api'],
    },
  ],
};

const OLLAMA_VALID = { response: JSON.stringify(VALID_JSON_RESPONSE) };
const OPENROUTER_VALID = { choices: [{ message: { content: JSON.stringify(VALID_JSON_RESPONSE) } }] };
const LMSTUDIO_VALID = { choices: [{ message: { content: JSON.stringify(VALID_JSON_RESPONSE) } }] };

function config(overrides: Partial<ReviewConfig> = {}): ReviewConfig {
  return { provider: 'ollama', model: 'qwen2.5', ...overrides };
}

describe('ReviewEngine', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('ollama provider', () => {
    it('parses valid response', async () => {
      mockFetch.mockResolvedValue(makeResponse(OLLAMA_VALID));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
      expect(result.score).toBe(85);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].category).toBe('security');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uses custom baseUrl', async () => {
      mockFetch.mockResolvedValue(makeResponse(OLLAMA_VALID));
      const engine = new ReviewEngine(config({ baseUrl: 'http://remote:11434' }));
      await engine.review({ name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://remote:11434/api/generate',
        expect.anything()
      );
    });

    it('handles non-200 response', async () => {
      mockFetch.mockResolvedValue(makeResponse(null, false, 500));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('handles unexpected response shape', async () => {
      mockFetch.mockResolvedValue(makeResponse({ notResponse: true }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('unexpected response shape');
    });
  });

  describe('openrouter provider', () => {
    it('parses valid response', async () => {
      mockFetch.mockResolvedValue(makeResponse(OPENROUTER_VALID));
      const engine = new ReviewEngine(config({ provider: 'openrouter', apiKey: 'test-key' }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
      expect(result.score).toBe(85);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('throws without api key', async () => {
      const engine = new ReviewEngine(config({ provider: 'openrouter' }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('handles non-200 response', async () => {
      mockFetch.mockResolvedValue(makeResponse(null, false, 401));
      const engine = new ReviewEngine(config({ provider: 'openrouter', apiKey: 'key' }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });

    it('handles unexpected response shape', async () => {
      mockFetch.mockResolvedValue(makeResponse({ error: 'bad request' }));
      const engine = new ReviewEngine(config({ provider: 'openrouter', apiKey: 'key' }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('unexpected response shape');
    });
  });

  describe('lmstudio provider', () => {
    it('parses valid response', async () => {
      mockFetch.mockResolvedValue(makeResponse(LMSTUDIO_VALID));
      const engine = new ReviewEngine(config({ provider: 'lmstudio' }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
      expect(result.score).toBe(85);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uses custom baseUrl', async () => {
      mockFetch.mockResolvedValue(makeResponse(LMSTUDIO_VALID));
      const engine = new ReviewEngine(config({ provider: 'lmstudio', baseUrl: 'http://remote:1234' }));
      await engine.review({ name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://remote:1234/v1/chat/completions',
        expect.anything()
      );
    });

    it('handles non-200 response', async () => {
      mockFetch.mockResolvedValue(makeResponse(null, false, 503));
      const engine = new ReviewEngine(config({ provider: 'lmstudio' }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
    });
  });

  describe('timeout', () => {
    it('aborts after configured timeout', async () => {
      mockFetch.mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new DOMException('The operation was aborted.', 'AbortError');
              reject(err);
            });
          }
        });
      });

      const engine = new ReviewEngine(config({ timeoutMs: 50 }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('clears timeout on success', async () => {
      mockFetch.mockResolvedValue(makeResponse(OLLAMA_VALID));
      const engine = new ReviewEngine(config({ timeoutMs: 5000 }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
    });
  });

  describe('parseResponse edge cases', () => {
    it('extracts JSON from fenced code block', async () => {
      const fenced = 'Here is the analysis:\n```json\n' + JSON.stringify(VALID_JSON_RESPONSE) + '\n```';
      mockFetch.mockResolvedValue(makeResponse({ response: fenced }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
      expect(result.score).toBe(85);
    });

    it('handles nested braces in JSON', async () => {
      const nested = {
        summary: 'ok',
        score: 70,
        recommendations: [{ category: 'a', severity: 'b', message: 'c', affectedComponents: ['d', { deep: true }] }],
      };
      mockFetch.mockResolvedValue(makeResponse({ response: JSON.stringify(nested) }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
      expect(result.score).toBe(70);
    });

    it('returns error for non-JSON text', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: 'no json here just plain text' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No JSON object found');
    });

    it('returns error for invalid JSON (unbalanced braces)', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{broken json' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No JSON object found');
    });

    it('returns error for valid braces but invalid JSON content', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{not: valid, json}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('defaults missing fields', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(true);
      expect(result.score).toBe(0);
      expect(result.summary).toBe('Review completed');
      expect(result.recommendations).toEqual([]);
    });

    it('clamps score above 100', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{"score":200}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.score).toBe(100);
    });

    it('clamps negative score to 0', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{"score":-10}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.score).toBe(0);
    });

    it('handles non-numeric score', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{"score":"good"}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.score).toBe(0);
    });

    it('defaults invalid category to architecture', async () => {
      const data = {
        score: 50,
        recommendations: [{ category: 'invalid', severity: 'info', message: 'test', affectedComponents: [] }],
      };
      mockFetch.mockResolvedValue(makeResponse({ response: JSON.stringify(data) }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.recommendations[0].category).toBe('architecture');
    });

    it('defaults invalid severity to info', async () => {
      const data = {
        score: 50,
        recommendations: [{ category: 'security', severity: 'invalid', message: 'test', affectedComponents: [] }],
      };
      mockFetch.mockResolvedValue(makeResponse({ response: JSON.stringify(data) }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.recommendations[0].severity).toBe('info');
    });

    it('handles recommendation with missing affectedComponents', async () => {
      const data = {
        score: 50,
        recommendations: [{ category: 'security', severity: 'warning', message: 'test' }],
      };
      mockFetch.mockResolvedValue(makeResponse({ response: JSON.stringify(data) }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.recommendations[0].affectedComponents).toEqual([]);
    });

    it('filters non-object recommendations', async () => {
      const data = {
        score: 50,
        recommendations: ['not an object', null, { category: 'security', severity: 'info', message: 'ok', affectedComponents: [] }],
      };
      mockFetch.mockResolvedValue(makeResponse({ response: JSON.stringify(data) }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.recommendations).toHaveLength(1);
    });

    it('handles summary as non-string', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{"score":50,"summary":123}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.summary).toBe('Review completed');
    });

    it('handles recommendations as non-array', async () => {
      mockFetch.mockResolvedValue(makeResponse({ response: '{"score":50,"recommendations":"not array"}' }));
      const engine = new ReviewEngine(config());
      const result = await engine.review({ name: 'test' });

      expect(result.recommendations).toEqual([]);
    });
  });

  describe('unsupported provider', () => {
    it('returns error for unknown provider', async () => {
      const engine = new ReviewEngine(config({ provider: 'unknown' as never }));
      const result = await engine.review({ name: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported provider');
    });
  });
});
