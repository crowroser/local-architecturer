import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Scanner } from '../src/core/scanner.js';
import { PathResolver } from '../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('Scanner', () => {
  let scanner: Scanner;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'));
    resolver = new PathResolver(tempDir);
    scanner = new Scanner(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should scan empty project', async () => {
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'empty-project',
      version: '1.0.0'
    }));

    const result = await scanner.scan();
    expect(result.name).toBe('empty-project');
    expect(result.packages).toHaveLength(1);
    expect(result.dockerConfigs).toHaveLength(0);
  });

  it('should scan project with pnpm workspace', async () => {
    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `
packages:
  - packages/*
`);

    await fs.mkdir(path.join(tempDir, 'packages'));
    await fs.mkdir(path.join(tempDir, 'packages', 'core'));
    await fs.writeFile(path.join(tempDir, 'packages', 'core', 'package.json'), JSON.stringify({
      name: '@app/core',
      version: '1.0.0'
    }));

    await fs.mkdir(path.join(tempDir, 'packages', 'ui'));
    await fs.writeFile(path.join(tempDir, 'packages', 'ui', 'package.json'), JSON.stringify({
      name: '@app/ui',
      version: '1.0.0',
      dependencies: {
        '@app/core': '1.0.0'
      }
    }));

    const result = await scanner.scan();
    expect(result.packages).toHaveLength(2);
    expect(result.packages.map(p => p.name)).toContain('@app/core');
    expect(result.packages.map(p => p.name)).toContain('@app/ui');
  });

  it('should scan project with Docker configs', async () => {
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'docker-project',
      version: '1.0.0'
    }));

    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:18');
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), `
services:
  web:
    image: nginx
  api:
    image: node:18
`);

    const result = await scanner.scan();
    expect(result.dockerConfigs).toHaveLength(2);
    expect(result.dockerConfigs.some(c => c.type === 'dockerfile')).toBe(true);
    expect(result.dockerConfigs.some(c => c.type === 'docker-compose')).toBe(true);
  });

  it('should build dependency graph with internal dependencies only', async () => {
    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `
packages:
  - packages/*
`);

    await fs.mkdir(path.join(tempDir, 'packages'));
    await fs.mkdir(path.join(tempDir, 'packages', 'core'));
    await fs.writeFile(path.join(tempDir, 'packages', 'core', 'package.json'), JSON.stringify({
      name: '@app/core',
      version: '1.0.0'
    }));

    await fs.mkdir(path.join(tempDir, 'packages', 'ui'));
    await fs.writeFile(path.join(tempDir, 'packages', 'ui', 'package.json'), JSON.stringify({
      name: '@app/ui',
      version: '1.0.0',
      dependencies: {
        '@app/core': 'workspace:*',
        'react': '^18.0.0',
        'lodash': '^4.17.0'
      }
    }));

    const result = await scanner.scan();
    expect(result.dependencies.nodes).toHaveLength(2);
    expect(result.dependencies.edges).toHaveLength(1);
    expect(result.dependencies.edges[0].source).toBe('@app/ui');
    expect(result.dependencies.edges[0].target).toBe('@app/core');
  });
});
