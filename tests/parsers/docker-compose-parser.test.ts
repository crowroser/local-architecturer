import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DockerComposeParser } from '../../src/parsers/docker-compose-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('DockerComposeParser', () => {
  let parser: DockerComposeParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docker-compose-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new DockerComposeParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', () => {
    const result = parser.parse('docker-compose.yml');
    expect(result).toBeNull();
  });

  it('should parse basic docker-compose.yml', async () => {
    const content = `
services:
  web:
    image: nginx
  api:
    image: node:18
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result).not.toBeNull();
    expect(result!.services).toHaveLength(2);
    expect(result!.services[0].name).toBe('web');
    expect(result!.services[0].image).toBe('nginx');
    expect(result!.services[1].name).toBe('api');
    expect(result!.services[1].image).toBe('node:18');
  });

  it('should parse ports correctly', async () => {
    const content = `
services:
  web:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].ports).toEqual(['80:80', '443:443']);
  });

  it('should parse volumes correctly', async () => {
    const content = `
services:
  api:
    image: node:18
    volumes:
      - ./src:/app/src
      - ./data:/app/data:ro
      - /app/node_modules
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].volumes).toEqual([
      { source: './src', target: '/app/src', readOnly: false },
      { source: './data', target: '/app/data', readOnly: true },
      { source: '/app/node_modules', target: '', readOnly: false },
    ]);
  });

  it('should parse depends_on as array', async () => {
    const content = `
services:
  web:
    image: nginx
    depends_on:
      - api
      - redis
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].dependsOn).toEqual(['api', 'redis']);
  });

  it('should parse depends_on as object', async () => {
    const content = `
services:
  web:
    image: nginx
    depends_on:
      api:
        condition: service_started
      redis:
        condition: service_healthy
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].dependsOn).toEqual(['api', 'redis']);
  });

  it('should parse networks', async () => {
    const content = `
services:
  web:
    image: nginx
    networks:
      - frontend
      - backend
networks:
  frontend:
  backend:
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].networks).toEqual(['frontend', 'backend']);
    expect(result!.networks).toEqual(['frontend', 'backend']);
  });

  it('should parse environment as array', async () => {
    const content = `
services:
  api:
    image: node:18
    environment:
      - NODE_ENV=production
      - PORT=3000
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].environment).toEqual({
      NODE_ENV: 'production',
      PORT: '3000',
    });
  });

  it('should parse environment as object', async () => {
    const content = `
services:
  api:
    image: node:18
    environment:
      NODE_ENV: production
      PORT: "3000"
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].environment).toEqual({
      NODE_ENV: 'production',
      PORT: '3000',
    });
  });

  it('should parse build context', async () => {
    const content = `
services:
  api:
    build: ./api
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services[0].build).toBe('./api');
    expect(result!.services[0].image).toBeUndefined();
  });

  it('should handle complex docker-compose.yml', async () => {
    const content = `
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - frontend
    environment:
      - API_URL=http://api:3000
  api:
    build: ./api
    ports:
      - "3000:3000"
    volumes:
      - ./api/src:/app/src
      - /app/node_modules
    depends_on:
      - db
      - redis
    networks:
      - frontend
      - backend
    environment:
      DB_HOST: db
      REDIS_HOST: redis
  db:
    image: postgres:14
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend
  redis:
    image: redis:alpine
    networks:
      - backend
networks:
  frontend:
  backend:
volumes:
  pgdata:
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), content);

    const result = parser.parse('docker-compose.yml');
    expect(result!.services).toHaveLength(4);
    expect(result!.networks).toEqual(['frontend', 'backend']);
    
    const webService = result!.services.find(s => s.name === 'web');
    expect(webService!.dependsOn).toEqual(['api']);
    expect(webService!.networks).toEqual(['frontend']);
    
    const apiService = result!.services.find(s => s.name === 'api');
    expect(apiService!.dependsOn).toEqual(['db', 'redis']);
    expect(apiService!.networks).toEqual(['frontend', 'backend']);
  });
});
