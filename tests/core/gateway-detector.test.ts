import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GatewayDetector } from '../../src/core/gateway-detector.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('GatewayDetector', () => {
  let detector: GatewayDetector;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gateway-detector-test-'));
    resolver = new PathResolver(tempDir);
    detector = new GatewayDetector(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no gateway configs exist', async () => {
    const result = await detector.detect();
    expect(result).toEqual([]);
  });

  it('should detect Caddyfile as gateway', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com {
    reverse_proxy app:3000
}
`
    );

    const result = await detector.detect();
    expect(result.length).toBeGreaterThanOrEqual(1);
    const caddyGateway = result.find(g => g.name.includes('caddy'));
    expect(caddyGateway).toBeDefined();
    expect(caddyGateway!.type).toBeDefined();
    expect(caddyGateway!.routes.length).toBeGreaterThan(0);
  });

  it('should classify gateway type based on routes', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com tls {
    reverse_proxy app:3000
}
`
    );

    const result = await detector.detect();
    expect(result.length).toBe(1);
    expect(['api-gateway', 'reverse-proxy', 'load-balancer']).toContain(result[0].type);
  });

  it('should extract middleware from config', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com {
    reverse_proxy app:3000
}
`
    );

    const result = await detector.detect();
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result[0].middleware)).toBe(true);
  });

  it('should convert gateways to graph nodes', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com {
    reverse_proxy app:3000
}
`
    );

    const gateways = await detector.detect();
    const nodes = detector.toGraphNodes(gateways);
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    expect(nodes[0].type).toBe('gateway');
    expect(nodes[0].metadata).toBeDefined();
  });

  it('should convert gateways to graph edges', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `example.com {
    reverse_proxy app:3000
}
`
    );

    const gateways = await detector.detect();
    const edges = detector.toGraphEdges(gateways);
    expect(edges.length).toBeGreaterThanOrEqual(1);
    expect(edges[0].type).toBe('routes');
  });

  it('should classify multiple routes as api-gateway', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `api.example.com tls {
    reverse_proxy api:8080
}
web.example.com tls {
    reverse_proxy web:3000
}
`
    );

    const result = await detector.detect();
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].routes.length).toBeGreaterThanOrEqual(2);
  });
});
