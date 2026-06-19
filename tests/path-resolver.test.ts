import { describe, it, expect, beforeEach } from 'vitest';
import { PathResolver } from '../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('PathResolver', () => {
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-resolver-test-'));
    resolver = new PathResolver(tempDir);
  });

  it('should return the root directory', () => {
    expect(resolver.getRootDir()).toBe(tempDir);
  });

  it('should resolve file paths correctly', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'test content');

    const resolved = await resolver.resolveFilePath('test.txt');
    expect(resolved).toBe(testFile);
  });

  it('should check if file exists (async)', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'test content');

    expect(await resolver.fileExists('test.txt')).toBe(true);
    expect(await resolver.fileExists('nonexistent.txt')).toBe(false);
  });

  it('should check if file exists (sync)', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'test content');

    expect(resolver.fileExistsSync('test.txt')).toBe(true);
    expect(resolver.fileExistsSync('nonexistent.txt')).toBe(false);
  });

  it('should resolve file path synchronously', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'test content');

    const resolved = resolver.resolveFilePathSync('test.txt');
    expect(resolved).toBe(testFile);
  });

  it('should throw when resolving non-existent file synchronously', () => {
    expect(() => resolver.resolveFilePathSync('nonexistent.txt')).toThrow('File not found');
  });

  it('should read file content', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFile, 'hello world');

    const content = await resolver.readFile('test.txt');
    expect(content).toBe('hello world');
  });

  it('should read JSON files', async () => {
    const testFile = path.join(tempDir, 'package.json');
    await fs.writeFile(testFile, JSON.stringify({ name: 'test', version: '1.0.0' }));

    const json = await resolver.readJson('package.json') as { name: string; version: string };
    expect(json.name).toBe('test');
    expect(json.version).toBe('1.0.0');
  });

  it('should find files using glob patterns', async () => {
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), '');
    await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), '');
    await fs.writeFile(path.join(tempDir, 'README.md'), '');

    const tsFiles = await resolver.findFiles('**/*.ts');
    expect(tsFiles).toHaveLength(2);
    expect(tsFiles.every(f => f.endsWith('.ts'))).toBe(true);
  });

  it('should get relative path correctly', () => {
    const absolutePath = path.join(tempDir, 'src', 'index.ts');
    const relative = resolver.getRelativePath(absolutePath);
    expect(relative).toBe(path.join('src', 'index.ts'));
  });
});
