import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PackageParser } from '../../src/parsers/package-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('PackageParser', () => {
  let parser: PackageParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'package-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new PackageParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return null for non-existent package.json', () => {
    const result = parser.parse('package.json');
    expect(result).toBeNull();
  });

  it('should parse package.json correctly', async () => {
    const pkg = {
      name: '@app/core',
      version: '1.0.0',
      dependencies: { lodash: '^4.17.0' },
      devDependencies: { typescript: '^5.0.0' },
    };
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

    const result = parser.parse('package.json');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('@app/core');
    expect(result!.version).toBe('1.0.0');
    expect(result!.dependencies).toEqual({ lodash: '^4.17.0' });
    expect(result!.devDependencies).toEqual({ typescript: '^5.0.0' });
  });

  it('should handle missing fields gracefully', async () => {
    const pkg = {};
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

    const result = parser.parse('package.json');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('unknown');
    expect(result!.version).toBe('0.0.0');
    expect(result!.dependencies).toEqual({});
    expect(result!.devDependencies).toEqual({});
  });

  it('should convert to DependencyNode', async () => {
    const pkg = {
      name: '@app/ui',
      version: '2.0.0',
    };
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

    const parsed = parser.parse('package.json');
    const node = parser.toNode(parsed!);
    
    expect(node.id).toBe('@app/ui');
    expect(node.type).toBe('package');
    expect(node.name).toBe('@app/ui');
  });
});
