import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProxyParser } from '../../src/parsers/proxy-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { DockerService } from '../../src/types/index.js';

describe('ProxyParser', () => {
  let parser: ProxyParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proxy-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new ProxyParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array with no proxy configs', async () => {
    const services: DockerService[] = [];
    const result = await parser.parseAll(services);
    expect(result).toEqual([]);
  });

  it('should parse Traefik labels from services', async () => {
    const services: DockerService[] = [
      {
        name: 'web',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: ['web'],
        environment: {
          'traefik.http.routers.web.rule': 'Host(`example.com`)',
          'traefik.http.routers.web.tls': 'true',
          'traefik.http.services.web.loadbalancer.server.port': '3000',
        },
      },
    ];

    const result = await parser.parseAll(services);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const traefikConfig = result.find(c => c.platform === 'traefik');
    expect(traefikConfig).toBeDefined();
    expect(traefikConfig!.routes.length).toBe(1);
    expect(traefikConfig!.routes[0].domain).toBe('example.com');
    expect(traefikConfig!.routes[0].targetService).toBe('web');
  });

  it('should handle services without proxy labels', async () => {
    const services: DockerService[] = [
      {
        name: 'app',
        ports: ['3000:3000'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = await parser.parseAll(services);
    expect(result).toEqual([]);
  });

  it('should combine Traefik and Caddy configs', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Caddyfile'),
      `api.example.com {
    reverse_proxy api:8080
}
`
    );

    const services: DockerService[] = [
      {
        name: 'web',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {
          'traefik.http.routers.web.rule': 'Host(`www.example.com`)',
        },
      },
    ];

    const result = await parser.parseAll(services);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const traefikConfig = result.find(c => c.platform === 'traefik');
    expect(traefikConfig).toBeDefined();
    const caddyConfig = result.find(c => c.platform === 'caddy');
    expect(caddyConfig).toBeDefined();
  });
});
