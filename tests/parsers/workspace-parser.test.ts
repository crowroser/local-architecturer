import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkspaceParser } from '../../src/parsers/workspace-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('WorkspaceParser', () => {
  let parser: WorkspaceParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new WorkspaceParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return null when no pnpm-workspace.yaml exists', () => {
    const result = parser.parse();
    expect(result).toBeNull();
  });

  it('should parse workspace config with packages', async () => {
    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `
packages:
  - packages/*
  - apps/*
`);

    const result = parser.parse();
    expect(result).not.toBeNull();
    expect(result!.packages).toEqual(['packages/*', 'apps/*']);
  });

  it('should handle empty packages array', async () => {
    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `
packages: []
`);

    const result = parser.parse();
    expect(result).not.toBeNull();
    expect(result!.packages).toEqual([]);
  });

  it('should handle missing packages key', async () => {
    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `
other: config
`);

    const result = parser.parse();
    expect(result).not.toBeNull();
    expect(result!.packages).toEqual([]);
  });
});
