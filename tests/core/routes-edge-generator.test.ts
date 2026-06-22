import { describe, it, expect } from 'vitest';
import { RoutesEdgeGenerator } from '../../src/core/routes-edge-generator.js';
import type { DependencyGraph } from '../../src/types/index.js';
import type { ProxyConfig } from '../../src/types/proxy.js';

describe('RoutesEdgeGenerator', () => {
  let generator: RoutesEdgeGenerator;

  beforeEach(() => {
    generator = new RoutesEdgeGenerator();
  });

  it('should generate route edges from proxy configs', () => {
    const proxyConfigs: ProxyConfig[] = [
      {
        platform: 'nginx',
        routes: [
          {
            domain: 'api.example.com',
            port: '8080',
            targetService: 'api-service',
            tls: false,
          },
          {
            domain: 'web.example.com',
            port: '3000',
            targetService: 'web-service',
            tls: true,
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'nginx', type: 'gateway', name: 'nginx' },
        { id: 'api-service', type: 'service', name: 'api-service' },
        { id: 'web-service', type: 'service', name: 'web-service' },
      ],
      edges: [],
    };

    const result = generator.generate(proxyConfigs, graph);
    expect(result.length).toBe(2);
    expect(result[0].type).toBe('routes');
    expect(result[0].source).toBe('nginx');
    expect(result[0].target).toBe('api-service');
    expect(result[1].target).toBe('web-service');
  });

  it('should return empty edges with no proxy configs', () => {
    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = generator.generate([], graph);
    expect(result).toEqual([]);
  });

  it('should skip routes when gateway node not in graph', () => {
    const proxyConfigs: ProxyConfig[] = [
      {
        platform: 'nginx',
        routes: [
          {
            domain: 'api.example.com',
            port: '8080',
            targetService: 'api-service',
            tls: false,
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'api-service', type: 'service', name: 'api-service' },
      ],
      edges: [],
    };

    const result = generator.generate(proxyConfigs, graph);
    expect(result).toEqual([]);
  });

  it('should skip routes when service node not in graph', () => {
    const proxyConfigs: ProxyConfig[] = [
      {
        platform: 'nginx',
        routes: [
          {
            domain: 'api.example.com',
            port: '8080',
            targetService: 'missing-service',
            tls: false,
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'nginx', type: 'gateway', name: 'nginx' },
      ],
      edges: [],
    };

    const result = generator.generate(proxyConfigs, graph);
    expect(result).toEqual([]);
  });

  it('should deduplicate routes to same target', () => {
    const proxyConfigs: ProxyConfig[] = [
      {
        platform: 'nginx',
        routes: [
          {
            domain: 'api1.example.com',
            port: '8080',
            targetService: 'api-service',
            tls: false,
          },
          {
            domain: 'api2.example.com',
            port: '8080',
            targetService: 'api-service',
            tls: false,
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'nginx', type: 'gateway', name: 'nginx' },
        { id: 'api-service', type: 'service', name: 'api-service' },
      ],
      edges: [],
    };

    const result = generator.generate(proxyConfigs, graph);
    expect(result.length).toBe(1);
  });

  it('should handle multiple proxy platforms', () => {
    const proxyConfigs: ProxyConfig[] = [
      {
        platform: 'nginx',
        routes: [
          {
            domain: 'api.example.com',
            port: '8080',
            targetService: 'api-service',
            tls: false,
          },
        ],
      },
      {
        platform: 'traefik',
        routes: [
          {
            domain: 'web.example.com',
            port: '3000',
            targetService: 'web-service',
            tls: true,
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'nginx-gateway', type: 'gateway', name: 'nginx-gateway' },
        { id: 'traefik-gateway', type: 'gateway', name: 'traefik-gateway' },
        { id: 'api-service', type: 'service', name: 'api-service' },
        { id: 'web-service', type: 'service', name: 'web-service' },
      ],
      edges: [],
    };

    const result = generator.generate(proxyConfigs, graph);
    expect(result.length).toBe(2);
  });
});
