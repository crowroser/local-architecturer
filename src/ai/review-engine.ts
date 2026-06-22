import { Logger } from '../utils/logger.js';
import { getConfig } from '../config.js';

export type ReviewProvider = 'ollama' | 'openrouter' | 'lmstudio';

export interface ReviewConfig {
  provider: ReviewProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  /** Per-request timeout in ms. Defaults to config.aiTimeoutMs (60000). */
  timeoutMs?: number;
}

export interface ReviewRecommendation {
  category: 'security' | 'performance' | 'architecture' | 'reliability' | 'maintainability';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  affectedComponents: string[];
}

export interface ReviewResult {
  recommendations: ReviewRecommendation[];
  summary: string;
  score: number;
  /**
   * Whether the review ran successfully. When `success` is false, the engine
   * could not obtain/parse an LLM response; callers should distinguish this
   * from a genuine "no issues" result rather than relying on score === 0.
   */
  success: boolean;
  /** Human-readable explanation of why the review failed, when success is false. */
  error?: string;
}

const SYSTEM_PROMPT = 'You are an expert software architect.';

const VALID_CATEGORIES = new Set<ReviewRecommendation['category']>([
  'security', 'performance', 'architecture', 'reliability', 'maintainability',
]);
const VALID_SEVERITIES = new Set<ReviewRecommendation['severity']>(['critical', 'warning', 'info']);

export class ReviewEngine {
  private config: ReviewConfig;
  private logger: Logger;
  private timeoutMs: number;

  constructor(config: ReviewConfig) {
    this.config = config;
    this.logger = new Logger('[ReviewEngine] ');
    this.timeoutMs = config.timeoutMs ?? getConfig().aiTimeoutMs;
  }

  async review(projectData: Record<string, unknown>): Promise<ReviewResult> {
    const prompt = this.buildPrompt(projectData);

    try {
      const response = await this.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM review failed: ${message}`);
      return {
        success: false,
        recommendations: [],
        summary: 'Failed to get review from LLM',
        score: 0,
        error: message,
      };
    }
  }

  private buildPrompt(projectData: Record<string, unknown>): string {
    const jsonStr = JSON.stringify(projectData, null, 2);

    return `${SYSTEM_PROMPT} Review the following project architecture and provide recommendations.

Project Structure:
${jsonStr}

Please provide:
1. Security issues and recommendations
2. Performance concerns
3. Architecture improvements
4. Reliability and scalability suggestions
5. Maintainability observations

For each recommendation, specify:
- Category (security/performance/architecture/reliability/maintainability)
- Severity (critical/warning/info)
- Message describing the issue
- Which components are affected

Provide a brief summary and an overall architecture score (0-100).

Format your response as JSON:
{
  "summary": "Brief summary of findings",
  "score": 85,
  "recommendations": [
    {
      "category": "security",
      "severity": "warning",
      "message": "Description of issue",
      "affectedComponents": ["component-name"]
    }
  ]
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'ollama':
        return this.callOllama(prompt);
      case 'openrouter':
        return this.callOpenRouter(prompt);
      case 'lmstudio':
        return this.callLMStudio(prompt);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /** Fetch with AbortController-based timeout so a hung provider can't hang the caller. */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async callOllama(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    const response = await this.fetchWithTimeout(
      `${baseUrl}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
        }),
      },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response?: string };
    if (typeof data.response !== 'string') {
      throw new Error('Ollama returned an unexpected response shape');
    }
    return data.response;
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';

    if (!this.config.apiKey) {
      throw new Error('OpenRouter requires an API key (set ARCHVIZ_OPENROUTER_API_KEY)');
    }

    const response = await this.fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        }),
      },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    return this.extractChatCompletionContent((await response.json()) as Record<string, unknown>);
  }

  private async callLMStudio(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:1234';

    const response = await this.fetchWithTimeout(
      `${baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        }),
      },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
    }

    return this.extractChatCompletionContent((await response.json()) as Record<string, unknown>);
  }

  /** Shared extraction for OpenAI-compatible responses (OpenRouter + LM Studio). */
  private extractChatCompletionContent(
    data: { choices?: Array<{ message?: { content?: string } }> }
  ): string {
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Provider returned an unexpected response shape');
    }
    return content;
  }

  /**
   * Extract the first balanced {...} JSON object from the LLM output.
   * Handles fenced code blocks (```json ... ```), leading/trailing prose,
   * and nested braces correctly (unlike the previous greedy regex).
   */
  private extractJsonObject(text: string): string | null {
    // Strip fenced code blocks first: ```[json]\n ... \n```
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const haystack = fenceMatch ? fenceMatch[1] : text;

    const start = haystack.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < haystack.length; i++) {
      const ch = haystack[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
      } else if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return haystack.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  private parseResponse(response: string): ReviewResult {
    const jsonStr = this.extractJsonObject(response);
    if (!jsonStr) {
      this.logger.warn('Failed to locate JSON object in LLM response');
      return {
        success: false,
        summary: response.slice(0, 500),
        score: 0,
        recommendations: [],
        error: 'No JSON object found in LLM response',
      };
    }

    let parsed: {
      summary?: unknown;
      score?: unknown;
      recommendations?: unknown;
    };
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to parse LLM response JSON: ${message}`);
      return {
        success: false,
        summary: response.slice(0, 500),
        score: 0,
        recommendations: [],
        error: `Invalid JSON: ${message}`,
      };
    }

    const recommendations: ReviewRecommendation[] = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
          .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
          .map((r) => {
            const category = String(r.category).toLowerCase();
            const severity = String(r.severity).toLowerCase();
            return {
              category: (VALID_CATEGORIES.has(category as ReviewRecommendation['category'])
                ? category
                : 'architecture') as ReviewRecommendation['category'],
              severity: (VALID_SEVERITIES.has(severity as ReviewRecommendation['severity'])
                ? severity
                : 'info') as ReviewRecommendation['severity'],
              message: typeof r.message === 'string' ? r.message : String(r.message ?? ''),
              affectedComponents: Array.isArray(r.affectedComponents)
                ? r.affectedComponents.filter((c): c is string => typeof c === 'string')
                : [],
            };
          })
      : [];

    const rawScore = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
    const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;

    return {
      success: true,
      recommendations,
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Review completed',
      score,
    };
  }
}
