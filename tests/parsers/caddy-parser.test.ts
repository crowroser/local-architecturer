import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaddyParser } from '../../src/parsers/caddy-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('CaddyParser', () => {
  let parser: CaddyParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'caddy-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new CaddyParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no Caddyfile exists', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid Caddyfile with reverse proxy', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com {
    reverse_proxy app:3000
}

api.example.com {
    reverse_proxy api:8080 port 8080
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('caddy');
    expect(result[0].routes.length).toBe(2);

    const wwwRoute = result[0].routes.find(r => r.domain === 'example.com');
    expect(wwwRoute).toBeDefined();
    expect(wwwRoute!.targetService).toBe('app');
    expect(wwwRoute!.port).toBe('80');

    const apiRoute = result[0].routes.find(r => r.domain === 'api.example.com');
    expect(apiRoute).toBeDefined();
    expect(apiRoute!.targetService).toBe('api');
    expect(apiRoute!.port).toBe('8080');
  });

  it('should parse empty Caddyfile', async () => {
    await fs.writeFile(path.join(tempDir, 'Caddyfile'), '');
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should detect TLS', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com tls {
    reverse_proxy app:3000
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].routes[0].tls).toBe(true);
  });

  it('should ignore comments', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `# This is a comment
example.com {
    # Another comment
    reverse_proxy app:3000
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].routes.length).toBe(1);
  });

  it('should find Caddyfiles in subdirectories', async () => {
    await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'config', 'Caddyfile'),
      `example.com {
    reverse_proxy app:3000
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].routes[0].targetService).toBe('app');
  });
});
