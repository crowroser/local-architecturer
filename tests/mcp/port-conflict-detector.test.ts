import { describe, it, expect } from 'vitest';
import { PortConflictDetector } from '../../src/mcp/port-conflict-detector.js';
import type { DockerService } from '../../src/types/index.js';

describe('PortConflictDetector', () => {
  it('should detect port conflicts', () => {
    const services: DockerService[] = [
      {
        name: 'web',
        image: 'nginx',
        ports: ['80:80', '443:443'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
      {
        name: 'api',
        image: 'node:18',
        ports: ['80:3000'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = PortConflictDetector.analyze(services, []);
    expect(result.portConflicts).toHaveLength(1);
    expect(result.portConflicts[0].port).toBe('80');
    expect(result.portConflicts[0].services).toContain('web');
    expect(result.portConflicts[0].services).toContain('api');
  });

  it('should detect no conflicts when ports are unique', () => {
    const services: DockerService[] = [
      {
        name: 'web',
        image: 'nginx',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
      {
        name: 'api',
        image: 'node:18',
        ports: ['3000:3000'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = PortConflictDetector.analyze(services, []);
    expect(result.portConflicts).toHaveLength(0);
  });

  it('should analyze volumes correctly', () => {
    const services: DockerService[] = [
      {
        name: 'api',
        image: 'node:18',
        ports: [],
        volumes: [
          { source: './src', target: '/app/src', readOnly: false },
          { source: './config', target: '/app/config', readOnly: true },
          { source: '/var/data', target: '/data', readOnly: false },
        ],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = PortConflictDetector.analyze(services, []);
    expect(result.volumes).toHaveLength(3);
    expect(result.volumes[0].isLocalPath).toBe(true);
    expect(result.volumes[0].readOnly).toBe(false);
    expect(result.volumes[1].readOnly).toBe(true);
    expect(result.volumes[2].isLocalPath).toBe(true);
  });

  it('should calculate summary correctly', () => {
    const services: DockerService[] = [
      {
        name: 'web',
        image: 'nginx',
        ports: ['80:80'],
        volumes: [{ source: './nginx.conf', target: '/etc/nginx/nginx.conf', readOnly: true }],
        dependsOn: ['api'],
        networks: ['frontend'],
        environment: {},
      },
      {
        name: 'api',
        image: 'node:18',
        ports: ['3000:3000'],
        volumes: [
          { source: './src', target: '/app/src', readOnly: false },
          { source: './data', target: '/app/data', readOnly: false },
        ],
        dependsOn: [],
        networks: ['frontend', 'backend'],
        environment: {},
      },
    ];

    const result = PortConflictDetector.analyze(services, ['frontend', 'backend']);
    expect(result.summary.totalServices).toBe(2);
    expect(result.summary.totalPorts).toBe(2);
    expect(result.summary.totalVolumes).toBe(3);
    expect(result.summary.totalNetworks).toBe(2);
  });

  it('should handle empty services', () => {
    const result = PortConflictDetector.analyze([], []);
    expect(result.services).toHaveLength(0);
    expect(result.portConflicts).toHaveLength(0);
    expect(result.volumes).toHaveLength(0);
    expect(result.summary.totalServices).toBe(0);
  });
});
