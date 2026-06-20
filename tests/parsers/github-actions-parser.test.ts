import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitHubActionsParser } from '../../src/parsers/github-actions-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('GitHubActionsParser', () => {
  let parser: GitHubActionsParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'github-actions-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new GitHubActionsParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no workflows exist', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse GitHub Actions workflow', async () => {
    await fs.mkdir(path.join(tempDir, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.github', 'workflows', 'ci.yml'),
      `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('github-actions');
    expect(result[0].name).toBe('CI');
    expect(result[0].triggers).toContain('push');
    expect(result[0].triggers).toContain('pull_request');
    expect(result[0].jobs.length).toBe(1);
    expect(result[0].jobs[0].name).toBe('test');
    expect(result[0].jobs[0].runsOn).toBe('ubuntu-latest');
    expect(result[0].jobs[0].steps.length).toBe(4);
  });

  it('should parse multiple jobs with dependencies', async () => {
    await fs.mkdir(path.join(tempDir, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.github', 'workflows', 'deploy.yml'),
      `name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].jobs.length).toBe(2);
    
    const deployJob = result[0].jobs.find(j => j.name === 'deploy');
    expect(deployJob).toBeDefined();
    expect(deployJob!.needs).toContain('build');
  });

  it('should handle workflow with string trigger', async () => {
    await fs.mkdir(path.join(tempDir, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.github', 'workflows', 'release.yml'),
      `name: Release

on: workflow_dispatch

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - run: echo "releasing"`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].triggers).toContain('workflow_dispatch');
  });

  it('should handle invalid YAML gracefully', async () => {
    await fs.mkdir(path.join(tempDir, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.github', 'workflows', 'invalid.yml'),
      `name: Invalid
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
      invalid yaml content [`
    );

    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });
});
