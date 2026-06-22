import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Config {
  defaultPort: number;
  defaultMcpPort: number;
  cacheTtlMs: number;
  gitTimeoutMs: number;
  gitShortTimeoutMs: number;
  maxHistoryCommits: number;
  /** Cache-invalidate secret. null disables the endpoint entirely. */
  cacheSecret: string | null;
  /** Host the servers bind to. Default 127.0.0.1 (local-only). */
  host: string;
  /** AI review engine defaults (overridable per-invocation). */
  aiProvider: 'ollama' | 'openrouter' | 'lmstudio';
  aiModel: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  /** Request timeout for LLM calls, ms. */
  aiTimeoutMs: number;
  /** Log level. */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

const defaults: Omit<Config, 'cacheSecret'> = {
  defaultPort: 4000,
  defaultMcpPort: 3001,
  cacheTtlMs: 30_000,
  gitTimeoutMs: 10_000,
  gitShortTimeoutMs: 5_000,
  maxHistoryCommits: 500,
  host: '127.0.0.1',
  aiProvider: 'ollama',
  aiModel: 'qwen2.5',
  aiTimeoutMs: 60_000,
  logLevel: 'info',
};

let cachedConfig: Config | null = null;

function loadEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const result: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
      result[key] = value;
    }
  } catch {
    // .env file not found, use defaults
  }
  return result;
}

const VALID_PROVIDERS = new Set(['ollama', 'openrouter', 'lmstudio']);
const VALID_LOG_LEVELS = new Set(['error', 'warn', 'info', 'debug']);

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const env = loadEnvFile();

  // Cache secret: never ship a hardcoded default. If unset, the endpoint is disabled.
  const rawSecret = env.ARCHVIZ_CACHE_SECRET || process.env.ARCHVIZ_CACHE_SECRET || process.env.CACHE_SECRET;
  const cacheSecret = rawSecret && rawSecret.trim().length > 0 ? rawSecret.trim() : null;

  const aiProviderRaw = (env.ARCHVIZ_PROVIDER || process.env.ARCHVIZ_PROVIDER || defaults.aiProvider).toLowerCase();
  const aiProvider = (VALID_PROVIDERS.has(aiProviderRaw) ? aiProviderRaw : defaults.aiProvider) as Config['aiProvider'];

  const logLevelRaw = (env.ARCHVIZ_LOG_LEVEL || process.env.ARCHVIZ_LOG_LEVEL || defaults.logLevel).toLowerCase();
  const logLevel = (VALID_LOG_LEVELS.has(logLevelRaw) ? logLevelRaw : defaults.logLevel) as Config['logLevel'];

  cachedConfig = {
    ...defaults,
    defaultPort: parseInt(env.ARCHVIZ_PORT || '', 10) || defaults.defaultPort,
    defaultMcpPort: parseInt(env.ARCHVIZ_MCP_PORT || '', 10) || defaults.defaultMcpPort,
    cacheTtlMs: parseInt(env.ARCHVIZ_CACHE_TTL || '', 10) || defaults.cacheTtlMs,
    gitTimeoutMs: parseInt(env.ARCHVIZ_GIT_TIMEOUT || '', 10) || defaults.gitTimeoutMs,
    gitShortTimeoutMs: parseInt(env.ARCHVIZ_GIT_SHORT_TIMEOUT || '', 10) || defaults.gitShortTimeoutMs,
    maxHistoryCommits: parseInt(env.ARCHVIZ_MAX_COMMITS || '', 10) || defaults.maxHistoryCommits,
    host: env.ARCHVIZ_HOST || process.env.ARCHVIZ_HOST || defaults.host,
    cacheSecret,
    aiProvider,
    aiModel: env.ARCHVIZ_MODEL || process.env.ARCHVIZ_MODEL || defaults.aiModel,
    aiBaseUrl: env.ARCHVIZ_BASE_URL || process.env.ARCHVIZ_BASE_URL || undefined,
    aiApiKey: env.ARCHVIZ_OPENROUTER_API_KEY || env.ARCHVIZ_API_KEY || process.env.ARCHVIZ_OPENROUTER_API_KEY || process.env.ARCHVIZ_API_KEY || undefined,
    aiTimeoutMs: parseInt(env.ARCHVIZ_AI_TIMEOUT || process.env.ARCHVIZ_AI_TIMEOUT || '', 10) || defaults.aiTimeoutMs,
    logLevel,
  };

  return cachedConfig;
}

/**
 * Generate a random secret for local-only convenience. Used when a cache secret
 * is needed but none was configured; logged once so the user can find it.
 */
export function generateCacheSecret(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function resetConfig(): void {
  cachedConfig = null;
}
