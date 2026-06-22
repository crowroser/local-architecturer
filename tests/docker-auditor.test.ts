import { describe, it, expect } from 'vitest';
import { DockerAuditor } from '../src/core/docker-auditor.js';
import type { DockerConfig } from '../src/types/index.js';

describe('DockerAuditor', () => {
  it('should return empty issues for empty configs', () => {
    const result = DockerAuditor.audit([]);
    expect(result.issues).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it('should warn when service has no image or build', () => {
    const configs: DockerConfig[] = [{
      type: 'docker-compose',
      path: 'docker-compose.yml',
      services: ['api'],
      serviceDetails: [{
        name: 'api',
        ports: [],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      }],
    }];
    const result = DockerAuditor.audit(configs);
    expect(result.issues.some(i => i.message.includes('No image or build'))).toBe(true);
  });

  it('should warn when using absolute host path', () => {
    const configs: DockerConfig[] = [{
      type: 'docker-compose',
      path: 'docker-compose.yml',
      services: ['db'],
      serviceDetails: [{
        name: 'db',
        image: 'postgres:15',
        ports: ['5432:5432'],
        volumes: [{ source: '/var/lib/postgresql/data', target: '/var/lib/postgresql/data', readOnly: false }],
        dependsOn: [],
        networks: [],
        environment: {},
      }],
    }];
    const result = DockerAuditor.audit(configs);
    expect(result.issues.some(i => i.message.includes('absolute host path'))).toBe(true);
  });

  it('should warn when volume path contains relative traversal', () => {
    const configs: DockerConfig[] = [{
      type: 'docker-compose',
      path: 'docker-compose.yml',
      services: ['app'],
      serviceDetails: [{
        name: 'app',
        image: 'node:18',
        ports: ['3000:3000'],
        volumes: [{ source: '../secrets', target: '/app/secrets', readOnly: false }],
        dependsOn: [],
        networks: [],
        environment: {},
      }],
    }];
    const result = DockerAuditor.audit(configs);
    expect(result.issues.some(i => i.message.includes('relative traversal'))).toBe(true);
  });

  it('should score lower for more issues', () => {
    const configs: DockerConfig[] = [{
      type: 'docker-compose',
      path: 'docker-compose.yml',
      services: ['bad'],
      serviceDetails: [{
        name: 'bad',
        ports: [],
        volumes: [{ source: '/', target: '/data', readOnly: false }],
        dependsOn: [],
        networks: [],
        environment: {},
      }],
    }];
    const result = DockerAuditor.audit(configs);
    expect(result.score).toBeLessThan(100);
    expect(result.summary.errors + result.summary.warnings).toBeGreaterThan(0);
  });
});
