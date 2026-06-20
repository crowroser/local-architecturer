import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NginxParser } from '../../src/parsers/nginx-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('NginxParser', () => {
  let parser: NginxParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nginx-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new NginxParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no nginx configs exist', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should find nginx.conf files', async () => {
    await fs.writeFile(
      path.join(tempDir, 'nginx.conf'),
      'server {\nlisten 80;\nserver_name example.com;\nproxy_pass http://backend:3000;\n}'
    );

    const files = resolver.findFilesSync('**/nginx.conf');
    expect(files.length).toBe(1);
  });

  it('should find conf.d/*.conf files', async () => {
    await fs.mkdir(path.join(tempDir, 'conf.d'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'conf.d', 'api.conf'),
      'server {\nlisten 80;\n}'
    );

    const files = resolver.findFilesSync('**/conf.d/*.conf');
    expect(files.length).toBe(1);
  });
});
