import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComposerParser } from '../src/parsers/composer-parser.js';
import { PathResolver } from '../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('ComposerParser', () => {
  let parser: ComposerParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'composer-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new ComposerParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should parse composer.json', async () => {
    await fs.writeFile(path.join(tempDir, 'composer.json'), JSON.stringify({
      name: 'laravel/laravel',
      type: 'project',
      description: 'The Laravel Framework',
      require: {
        'php': '^8.1',
        'laravel/framework': '^10.0',
      },
      'require-dev': {
        'phpunit/phpunit': '^10.0',
      },
    }));

    const result = parser.parse('composer.json');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('laravel/laravel');
    expect(result!.type).toBe('project');
    expect(Object.keys(result!.require)).toContain('laravel/framework');
    expect(Object.keys(result!.requireDev)).toContain('phpunit/phpunit');
  });

  it('should return null for non-existent file', () => {
    const result = parser.parse('nonexistent.json');
    expect(result).toBeNull();
  });

  it('should parse all composer.json files', async () => {
    await fs.mkdir(path.join(tempDir, 'packages'));
    await fs.mkdir(path.join(tempDir, 'packages', 'core'));
    await fs.mkdir(path.join(tempDir, 'packages', 'api'));
    
    await fs.writeFile(path.join(tempDir, 'packages', 'core', 'composer.json'), JSON.stringify({
      name: 'app/core',
    }));
    await fs.writeFile(path.join(tempDir, 'packages', 'api', 'composer.json'), JSON.stringify({
      name: 'app/api',
    }));

    const packages = parser.parseAll();
    expect(packages).toHaveLength(2);
    expect(packages.map(p => p.name)).toContain('app/core');
    expect(packages.map(p => p.name)).toContain('app/api');
  });
});
