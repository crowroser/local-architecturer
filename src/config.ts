import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Config {
  defaultPort: number;
  defaultMcpPort: number;
  cacheTtlMs: number;
  gitTimeoutMs: number;
  gitShortTimeoutMs: number;
  maxHistoryCommits: number;
  cacheSecret: string;
}

const defaults: Config = {
  defaultPort: 4000,
  defaultMcpPort: 3001,
  cacheTtlMs: 30_000,
  gitTimeoutMs: 10_000,
  gitShortTimeoutMs: 5_000,
  maxHistoryCommits: 500,
  cacheSecret: 'archviz-cache-invalidate',
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

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const env = loadEnvFile();

  cachedConfig = {
    defaultPort: parseInt(env.ARCHVIZ_PORT || '', 10) || defaults.defaultPort,
    defaultMcpPort: parseInt(env.ARCHVIZ_MCP_PORT || '', 10) || defaults.defaultMcpPort,
    cacheTtlMs: parseInt(env.ARCHVIZ_CACHE_TTL || '', 10) || defaults.cacheTtlMs,
    gitTimeoutMs: parseInt(env.ARCHVIZ_GIT_TIMEOUT || '', 10) || defaults.gitTimeoutMs,
    gitShortTimeoutMs: parseInt(env.ARCHVIZ_GIT_SHORT_TIMEOUT || '', 10) || defaults.gitShortTimeoutMs,
    maxHistoryCommits: parseInt(env.ARCHVIZ_MAX_COMMITS || '', 10) || defaults.maxHistoryCommits,
    cacheSecret: env.ARCHVIZ_CACHE_SECRET || process.env.CACHE_SECRET || defaults.cacheSecret,
  };

  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}
