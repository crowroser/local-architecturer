import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TraefikParser } from '../../src/parsers/traefik-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { DockerService } from '../../src/types/index.js';

describe('TraefikParser', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'traefik-parser-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return null for services without Traefik labels', () => {
    const parser = new TraefikParser();
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

    const result = parser.parseFromServices(services);
    expect(result).toBeNull();
  });

  it('should parse Traefik labels from Docker service', () => {
    const parser = new TraefikParser();
    const services: DockerService[] = [
      {
        name: 'web-app',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: ['web'],
        environment: {
          'traefik.http.routers.web.rule': 'Host(`example.com`)',
          'traefik.http.routers.web.tls': 'true',
          'traefik.http.services.web.loadbalancer.server.port': '3000',
          'traefik.docker.network': 'web',
        },
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result).not.toBeNull();
    expect(result!.platform).toBe('traefik');
    expect(result!.routes.length).toBe(1);
    expect(result!.routes[0].domain).toBe('example.com');
    expect(result!.routes[0].tls).toBe(true);
    expect(result!.routes[0].targetService).toBe('web-app');
  });

  it('should parse middleware from Traefik labels', () => {
    const parser = new TraefikParser();
    const services: DockerService[] = [
      {
        name: 'api',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {
          'traefik.http.routers.api.rule': 'Host(`api.example.com`)',
          'traefik.http.routers.api.middlewares': 'auth,rate-limit',
        },
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result).not.toBeNull();
    expect(result!.routes[0].middleware).toEqual(['auth', 'rate-limit']);
  });

  it('should parse multiple services with Traefik labels', () => {
    const parser = new TraefikParser();
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
      {
        name: 'api',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {
          'traefik.http.routers.api.rule': 'Host(`api.example.com`)',
        },
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result).not.toBeNull();
    expect(result!.routes.length).toBe(2);
  });

  it('should return empty array when no resolver provided', async () => {
    const parser = new TraefikParser();
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });
});
