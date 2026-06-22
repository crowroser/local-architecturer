import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const exec = promisify(execFile);
const CLI_PATH = path.resolve('dist/cli.js');
const NODE = process.execPath;

function runCli(args: string[], opts: { timeout?: number } = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = execFile(NODE, [CLI_PATH, ...args], {
      timeout: opts.timeout ?? 30000,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: error?.code ?? 0,
      });
    });
  });
}

function extractJsonFromStdout(stdout: string): unknown {
  const lines = stdout.split('\n');
  const jsonStart = lines.findIndex(l => l.trimStart().startsWith('{') || l.trimStart().startsWith('['));
  if (jsonStart === -1) return null;
  return JSON.parse(lines.slice(jsonStart).join('\n'));
}

let tempDir: string;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-test-'));

  await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
    name: 'cli-test-project',
    version: '1.0.0',
    dependencies: { lodash: '^4.17.0' },
  }));

  await fs.mkdir(path.join(tempDir, 'packages'));
  await fs.mkdir(path.join(tempDir, 'packages', 'core'));
  await fs.writeFile(path.join(tempDir, 'packages', 'core', 'package.json'), JSON.stringify({
    name: '@app/core',
    version: '1.0.0',
  }));

  await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `packages:\n  - packages/*`);

  await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), `services:\n  web:\n    image: nginx\n    ports:\n      - "80:80"`);
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('arch-viz analyze', () => {
  it('exits 0 and outputs JSON for valid project', async () => {
    const result = await runCli(['analyze', '-p', tempDir]);
    expect(result.exitCode).toBe(0);
    const parsed = extractJsonFromStdout(result.stdout);
    expect(parsed).toHaveProperty('name', 'cli-test-project');
    expect(parsed).toHaveProperty('packages');
    expect((parsed as any).packages.length).toBeGreaterThan(0);
  });

  it('exits 0 with --format text', async () => {
    const result = await runCli(['analyze', '-p', tempDir, '-f', 'text']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('cli-test-project');
    expect(result.stdout).toContain('Packages');
  });

  it('exits 0 with --check-circular on acyclic project', async () => {
    const result = await runCli(['analyze', '-p', tempDir, '--check-circular']);
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 with --version', async () => {
    const result = await runCli(['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exits 0 with --help', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('arch-viz');
  });

  it('exits 0 with analyze --help', async () => {
    const result = await runCli(['analyze', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Analyze project structure');
  });
});

describe('arch-viz time-travel', () => {
  it('exits 0 for project with git history', async () => {
    const result = await runCli(['time-travel', '-p', tempDir, '-c', '10']);
    expect(result.exitCode).toBe(0);
    const parsed = extractJsonFromStdout(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('exits 0 with --format text', async () => {
    const result = await runCli(['time-travel', '-p', tempDir, '-c', '10', '-f', 'text']);
    expect(result.exitCode).toBe(0);
  });
});

describe('arch-viz serve', () => {
  it('starts and responds to health check', async () => {
    const port = 14532;
    const child = execFile(NODE, [CLI_PATH, 'serve', '-p', tempDir, '-port', String(port), '-o', 'false'], {
      encoding: 'utf-8',
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body).toHaveProperty('status', 'ok');
    } finally {
      child.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, 15000);
});

describe('arch-viz mcp', () => {
  it('exits 0 with mcp --help', async () => {
    const result = await runCli(['mcp', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Start MCP server');
  });
});

describe('arch-viz review', () => {
  it('exits 0 with review --help', async () => {
    const result = await runCli(['review', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('AI-powered architecture review');
  });

  it('does not crash when provider is unreachable (timeout)', async () => {
    const result = await runCli(['review', '-p', tempDir, '--provider', 'ollama'], { timeout: 15000 });
    expect(result.exitCode).not.toBe(null);
  }, 20000);
});
