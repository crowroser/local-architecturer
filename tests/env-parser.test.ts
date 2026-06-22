import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvParser } from '../src/parsers/env-parser.js';
import { PathResolver } from '../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('EnvParser', () => {
  let parser: EnvParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'env-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new EnvParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should parse .env.example file', async () => {
    await fs.writeFile(path.join(tempDir, '.env.example'), `
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=sk_test_123
SECRET_KEY=
DEBUG=true
`);

    const result = parser.parseEnvFile('.env.example');
    expect(result).not.toBeNull();
    expect(result!.variables).toHaveLength(4);
    expect(result!.variables[0].key).toBe('DATABASE_URL');
    expect(result!.variables[2].isRequired).toBe(true);
  });

  it('should return null for non-existent file', () => {
    const result = parser.parseEnvFile('.env.nonexistent');
    expect(result).toBeNull();
  });

  it('should skip comments and empty lines', async () => {
    await fs.writeFile(path.join(tempDir, '.env.example'), `
# This is a comment
DATABASE_URL=postgres://localhost/mydb

# Another comment
API_KEY=sk_test
`);

    const result = parser.parseEnvFile('.env.example');
    expect(result!.variables).toHaveLength(2);
  });

  it('should handle quoted values', async () => {
    await fs.writeFile(path.join(tempDir, '.env.example'), `
DB_HOST="localhost"
DB_PORT='5432'
`);

    const result = parser.parseEnvFile('.env.example');
    expect(result!.variables[0].value).toBe('localhost');
    expect(result!.variables[1].value).toBe('5432');
  });

  it('should parse multiple .env.example files', async () => {
    await fs.mkdir(path.join(tempDir, 'apps'));
    await fs.mkdir(path.join(tempDir, 'apps', 'web'));
    await fs.mkdir(path.join(tempDir, 'apps', 'api'));
    
    await fs.writeFile(path.join(tempDir, '.env.example'), 'ROOT_VAR=1');
    await fs.writeFile(path.join(tempDir, 'apps', 'web', '.env.example'), 'WEB_VAR=2');
    await fs.writeFile(path.join(tempDir, 'apps', 'api', '.env.example'), 'API_VAR=3');

    const results = parser.parseExampleFiles();
    expect(results).toHaveLength(3);
  });

  it('should extract env vars from Node.js source code', async () => {
    await fs.writeFile(path.join(tempDir, 'app.ts'), `
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env['API_KEY'];
const port = process.env.PORT || 3000;
`);

    const vars = parser.extractFromSourceCode(['app.ts']);
    expect(vars.has('DATABASE_URL')).toBe(true);
    expect(vars.has('API_KEY')).toBe(true);
    expect(vars.has('PORT')).toBe(true);
  });
});
