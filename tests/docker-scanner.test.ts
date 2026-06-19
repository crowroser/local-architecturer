import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DockerScanner } from '../src/core/docker-scanner.js';
import { PathResolver } from '../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('DockerScanner', () => {
  let scanner: DockerScanner;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docker-scanner-test-'));
    resolver = new PathResolver(tempDir);
    scanner = new DockerScanner(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no Docker files exist', async () => {
    const result = await scanner.scan();
    expect(result).toEqual([]);
  });

  it('should detect Dockerfile', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:18');

    const result = await scanner.scan();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('dockerfile');
    expect(result[0].path).toBe('Dockerfile');
  });

  it('should detect nested Dockerfile', async () => {
    await fs.mkdir(path.join(tempDir, 'services'));
    await fs.writeFile(path.join(tempDir, 'services', 'Dockerfile'), 'FROM node:18');

    const result = await scanner.scan();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('dockerfile');
    expect(result[0].path).toBe(path.join('services', 'Dockerfile'));
  });

  it('should detect docker-compose.yml with service details', async () => {
    const composeContent = `
services:
  web:
    image: nginx
    ports:
      - "80:80"
  api:
    image: node:18
    depends_on:
      - web
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), composeContent);

    const result = await scanner.scan();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('docker-compose');
    expect(result[0].services).toEqual(['web', 'api']);
    expect(result[0].serviceDetails).toHaveLength(2);
    expect(result[0].serviceDetails![0].name).toBe('web');
    expect(result[0].serviceDetails![0].image).toBe('nginx');
    expect(result[0].serviceDetails![0].ports).toEqual(['80:80']);
    expect(result[0].serviceDetails![1].dependsOn).toEqual(['web']);
  });

  it('should detect docker-compose.yaml', async () => {
    const composeContent = `
services:
  app:
    image: node:18
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yaml'), composeContent);

    const result = await scanner.scan();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('docker-compose');
    expect(result[0].services).toEqual(['app']);
  });

  it('should detect both yml and yaml files without duplicates', async () => {
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'services:\n  web:\n    image: nginx');
    await fs.writeFile(path.join(tempDir, 'docker-compose.yaml'), 'services:\n  api:\n    image: node');

    const result = await scanner.scan();
    expect(result).toHaveLength(2);
    const paths = result.map(c => c.path);
    expect(paths).toContain('docker-compose.yml');
    expect(paths).toContain('docker-compose.yaml');
  });

  it('should detect multiple Docker files', async () => {
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), 'FROM node:18');
    await fs.mkdir(path.join(tempDir, 'services'));
    await fs.writeFile(path.join(tempDir, 'services', 'Dockerfile'), 'FROM nginx');
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'services:\n  web:\n    image: nginx');

    const result = await scanner.scan();
    expect(result).toHaveLength(3);
    expect(result.filter(c => c.type === 'dockerfile')).toHaveLength(2);
    expect(result.filter(c => c.type === 'docker-compose')).toHaveLength(1);
  });

  it('should handle invalid docker-compose gracefully', async () => {
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'invalid: yaml: content: [');

    const result = await scanner.scan();
    expect(result).toHaveLength(1);
    expect(result[0].services).toEqual([]);
  });

  it('should parse networks from docker-compose', async () => {
    const composeContent = `
services:
  web:
    image: nginx
    networks:
      - frontend
  api:
    image: node:18
    networks:
      - frontend
      - backend
networks:
  frontend:
  backend:
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), composeContent);

    const result = await scanner.scan();
    expect(result[0].networks).toEqual(['frontend', 'backend']);
    expect(result[0].serviceDetails![0].networks).toEqual(['frontend']);
    expect(result[0].serviceDetails![1].networks).toEqual(['frontend', 'backend']);
  });

  it('should parse volumes with readOnly flag', async () => {
    const composeContent = `
services:
  api:
    image: node:18
    volumes:
      - ./src:/app/src
      - ./config:/app/config:ro
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), composeContent);

    const result = await scanner.scan();
    const apiService = result[0].serviceDetails![0];
    expect(apiService.volumes).toHaveLength(2);
    expect(apiService.volumes[0].readOnly).toBe(false);
    expect(apiService.volumes[1].readOnly).toBe(true);
  });
});
