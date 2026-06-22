import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ArchitectureMcpServer } from '../../src/mcp/server.js';
import { Scanner } from '../../src/core/scanner.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('ArchitectureMcpServer', () => {
  let server: ArchitectureMcpServer;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));

    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        lodash: '^4.17.0',
      },
    }));

    await fs.mkdir(path.join(tempDir, 'packages'));
    await fs.mkdir(path.join(tempDir, 'packages', 'core'));
    await fs.writeFile(path.join(tempDir, 'packages', 'core', 'package.json'), JSON.stringify({
      name: '@app/core',
      version: '1.0.0',
    }));

    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `packages:\n  - packages/*`);

    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), `services:\n  web:\n    image: nginx\n    ports:\n      - "80:80"\n    depends_on:\n      - api\n  api:\n    image: node:18\n    ports:\n      - "3000:3000"`);

    server = new ArchitectureMcpServer(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create server instance', () => {
    expect(server).toBeDefined();
  });

  it('should have startStdio method', () => {
    expect(typeof server.startStdio).toBe('function');
  });

  it('should have startHttp method', () => {
    expect(typeof server.startHttp).toBe('function');
  });

  it('should scan project via scanner', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    expect(result).toHaveProperty('packages');
    expect(result).toHaveProperty('dependencies');
    expect(result.packages.length).toBeGreaterThan(0);
  });

  it('should detect workspace packages', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    const corePkg = result.packages.find(p => p.name === '@app/core');
    expect(corePkg).toBeDefined();
  });

  it('should scan project name correctly', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    expect(result.name).toBe('test-project');
  });

  it('should detect docker services', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    expect(result.dockerConfigs.length).toBeGreaterThan(0);
    const allServices = result.dockerConfigs.flatMap(c => c.serviceDetails || []);
    expect(allServices.length).toBeGreaterThanOrEqual(2);
  });

  it('should build dependency graph with nodes and edges', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    expect(Array.isArray(result.dependencies.nodes)).toBe(true);
    expect(Array.isArray(result.dependencies.edges)).toBe(true);
  });

  it('should have correct project structure fields', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('rootDir');
    expect(result).toHaveProperty('packages');
    expect(result).toHaveProperty('dockerConfigs');
    expect(result).toHaveProperty('dependencies');
    expect(result.name).toBe('test-project');
  });

  it('should return proxy configs array', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const configs = await scanner.getProxyConfigs();
    expect(Array.isArray(configs)).toBe(true);
  });

  it('should return data flows array', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const flows = await scanner.getDataFlows();
    expect(Array.isArray(flows)).toBe(true);
  });

  it('should return database schemas array', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const schemas = await scanner.getDBSchemas();
    expect(Array.isArray(schemas)).toBe(true);
  });
});
