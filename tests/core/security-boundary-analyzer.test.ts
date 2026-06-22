import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityBoundaryAnalyzer } from '../../src/core/security-boundary-analyzer.js';
import type { DockerConfig, DockerService } from '../../src/types/index.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('SecurityBoundaryAnalyzer', () => {
  let analyzer: SecurityBoundaryAnalyzer;

  beforeEach(() => {
    analyzer = new SecurityBoundaryAnalyzer();
  });

  it('should analyze Docker configs for security boundaries', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app', 'db'],
        serviceDetails: [
          {
            name: 'app',
            image: 'node:20',
            ports: ['3000:3000'],
            volumes: [
              { source: '/var/run/docker.sock', target: '/var/run/docker.sock', readOnly: false },
              { source: './data', target: '/app/data', readOnly: true },
            ],
            dependsOn: ['db'],
            networks: [],
            environment: {},
          },
          {
            name: 'db',
            image: 'postgres:16',
            ports: ['5432:5432'],
            volumes: [
              { source: '/var/lib/docker/pgdata', target: '/var/lib/postgresql/data', readOnly: false },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries.length).toBeGreaterThan(0);
    expect(result.summary.totalVolumes).toBeGreaterThan(0);
    expect(typeof result.summary.readOnly).toBe('number');
    expect(typeof result.summary.readWrite).toBe('number');
    expect(typeof result.summary.dangerous).toBe('number');
    expect(typeof result.summary.warnings).toBe('number');
  });

  it('should detect dangerous volumes', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
        serviceDetails: [
          {
            name: 'app',
            ports: [],
            volumes: [
              { source: '/var/run/docker.sock', target: '/var/run/docker.sock', readOnly: false },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries.length).toBe(1);
    expect(result.boundaries[0].riskLevel).toBe('dangerous');
    expect(result.boundaries[0].reason).toContain('Docker socket');
  });

  it('should detect sensitive file mounts', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
        serviceDetails: [
          {
            name: 'app',
            ports: [],
            volumes: [
              { source: '/app/.env', target: '/app/.env', readOnly: false },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries[0].riskLevel).toBe('dangerous');
  });

  it('should mark read-only sensitive mounts as warning', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
        serviceDetails: [
          {
            name: 'app',
            ports: [],
            volumes: [
              { source: '/app/.env', target: '/app/.env', readOnly: true },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries[0].riskLevel).toBe('warning');
    expect(result.boundaries[0].permission).toBe('ro');
  });

  it('should detect shared volumes between services', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app', 'worker'],
        serviceDetails: [
          {
            name: 'app',
            ports: [],
            volumes: [
              { source: '/data/shared', target: '/data', readOnly: false },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
          {
            name: 'worker',
            ports: [],
            volumes: [
              { source: '/data/shared', target: '/data', readOnly: false },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    const sharedBoundary = result.boundaries.find(b => b.targetService === 'worker');
    expect(sharedBoundary).toBeDefined();
  });

  it('should return empty results with no service details', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries.length).toBe(0);
    expect(result.summary.totalVolumes).toBe(0);
  });

  it('should return empty results with empty configs', () => {
    const result = analyzer.analyze([]);
    expect(result.boundaries.length).toBe(0);
    expect(result.summary.totalVolumes).toBe(0);
    expect(result.summary.readOnly).toBe(0);
    expect(result.summary.readWrite).toBe(0);
    expect(result.summary.dangerous).toBe(0);
    expect(result.summary.warnings).toBe(0);
  });

  it('should detect critical system path mounts', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
        serviceDetails: [
          {
            name: 'app',
            ports: [],
            volumes: [
              { source: '/etc', target: '/host-etc', readOnly: false },
              { source: '/root', target: '/host-root', readOnly: false },
              { source: '/proc', target: '/host-proc', readOnly: false },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries.length).toBe(3);
    result.boundaries.forEach(b => {
      expect(b.riskLevel).toBe('dangerous');
    });
  });

  it('should detect sensitive patterns like .key and .pem', () => {
    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
        serviceDetails: [
          {
            name: 'app',
            ports: [],
            volumes: [
              { source: '/certs/server.key', target: '/certs/server.key', readOnly: false },
              { source: '/certs/ca.pem', target: '/certs/ca.pem', readOnly: true },
              { source: '/ssh/id_rsa', target: '/ssh/id_rsa', readOnly: true },
            ],
            dependsOn: [],
            networks: [],
            environment: {},
          },
        ],
      },
    ];

    const result = analyzer.analyze(dockerConfigs);
    expect(result.boundaries.length).toBe(3);
    expect(result.boundaries[0].riskLevel).toBe('dangerous');
    expect(result.boundaries[1].riskLevel).toBe('warning');
    expect(result.boundaries[2].riskLevel).toBe('warning');
  });
});
