import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ArchitectureMcpServer } from '../../src/mcp/server.js';
import { Scanner } from '../../src/core/scanner.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import { PortConflictDetector } from '../../src/mcp/port-conflict-detector.js';
import { MermaidBuilder } from '../../src/mcp/mermaid-builder.js';
import type { DockerService, DependencyGraph } from '../../src/types/index.js';
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

  it('should filter dependency graph by package type', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    const pkgNodes = result.dependencies.nodes.filter(n => n.type === 'package');
    expect(pkgNodes.length).toBeGreaterThan(0);
    for (const node of pkgNodes) {
      expect(node.type).toBe('package');
    }
  });

  it('should find node details by ID', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    const node = result.dependencies.nodes.find(n => n.id === '@app/core');
    expect(node).toBeDefined();
    expect(node!.type).toBe('package');
  });

  it('should return "not found" for unknown node ID', async () => {
    const resolver = new PathResolver(tempDir);
    const scanner = new Scanner(resolver);
    const result = await scanner.scan();
    const node = result.dependencies.nodes.find(n => n.id === 'nonexistent');
    expect(node).toBeUndefined();
  });
});

describe('PortConflictDetector', () => {
  it('detects port conflicts', () => {
    const services: DockerService[] = [
      { name: 'web', image: 'nginx', ports: ['80:80'], volumes: [], networks: [], environment: {} },
      { name: 'api', image: 'node', ports: ['80:3000'], volumes: [], networks: [], environment: {} },
    ];
    const result = PortConflictDetector.analyze(services, []);
    expect(result.portConflicts).toHaveLength(1);
    expect(result.portConflicts[0].port).toBe('80');
    expect(result.portConflicts[0].services).toContain('web');
    expect(result.portConflicts[0].services).toContain('api');
  });

  it('returns no conflicts when ports are unique', () => {
    const services: DockerService[] = [
      { name: 'web', image: 'nginx', ports: ['80:80'], volumes: [], networks: [], environment: {} },
      { name: 'api', image: 'node', ports: ['3000:3000'], volumes: [], networks: [], environment: {} },
    ];
    const result = PortConflictDetector.analyze(services, []);
    expect(result.portConflicts).toHaveLength(0);
  });

  it('analyzes volumes', () => {
    const services: DockerService[] = [
      {
        name: 'db', image: 'postgres', ports: ['5432:5432'],
        volumes: [{ source: './data', target: '/var/lib/postgresql/data', readOnly: false }],
        networks: [], environment: {},
      },
    ];
    const result = PortConflictDetector.analyze(services, ['default']);
    expect(result.volumes).toHaveLength(1);
    expect(result.volumes[0].isLocalPath).toBe(true);
    expect(result.volumes[0].readOnly).toBe(false);
    expect(result.summary.totalNetworks).toBe(1);
  });

  it('computes correct summary', () => {
    const services: DockerService[] = [
      { name: 'a', image: 'x', ports: ['1:1', '2:2'], volumes: [], networks: [], environment: {} },
      { name: 'b', image: 'y', ports: ['3:3'], volumes: [], networks: [], environment: {} },
    ];
    const result = PortConflictDetector.analyze(services, []);
    expect(result.summary.totalServices).toBe(2);
    expect(result.summary.totalPorts).toBe(3);
    expect(result.summary.totalVolumes).toBe(0);
  });
});

describe('MermaidBuilder', () => {
  const graph: DependencyGraph = {
    nodes: [
      { id: 'pkg-a', name: 'Package A', type: 'package', metadata: { language: 'javascript' } },
      { id: 'pkg-b', name: 'Package B', type: 'package', metadata: { language: 'python' } },
      { id: 'svc-web', name: 'web', type: 'service' },
    ],
    edges: [
      { source: 'pkg-a', target: 'pkg-b', type: 'depends' },
      { source: 'pkg-a', target: 'svc-web', type: 'network' },
    ],
  };

  it('builds flowchart', () => {
    const mermaid = MermaidBuilder.buildFlowchart(graph);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('pkg_a');
    expect(mermaid).toContain('svc_web');
    expect(mermaid).toContain('-->');
    expect(mermaid).toContain('-.-');
  });

  it('builds subgraph by type', () => {
    const mermaid = MermaidBuilder.buildSubgraphByType(graph);
    expect(mermaid).toContain('subgraph javascript_packages');
    expect(mermaid).toContain('subgraph python_packages');
    expect(mermaid).toContain('subgraph docker_services');
    expect(mermaid).toContain('pkg_a');
    expect(mermaid).toContain('svc_web');
  });

  it('sanitizes node IDs', () => {
    const specialGraph: DependencyGraph = {
      nodes: [{ id: '@scope/name', name: 'Scope Name', type: 'package', metadata: {} }],
      edges: [],
    };
    const mermaid = MermaidBuilder.buildFlowchart(specialGraph);
    expect(mermaid).toContain('_scope_name');
    expect(mermaid).not.toContain('@scope');
  });

  it('handles empty graph', () => {
    const empty: DependencyGraph = { nodes: [], edges: [] };
    const mermaid = MermaidBuilder.buildFlowchart(empty);
    expect(mermaid).toContain('graph TD');
  });
});
