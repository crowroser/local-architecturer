import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ArchitectureMcpServer } from '../../src/mcp/server.js';
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

    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), `
packages:
  - packages/*
`);

    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), `
services:
  web:
    image: nginx
    ports:
      - "80:80"
    depends_on:
      - api
  api:
    image: node:18
    ports:
      - "3000:3000"
`);

    server = new ArchitectureMcpServer(tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create server instance', () => {
    expect(server).toBeDefined();
  });

  it('should have start method', () => {
    expect(typeof server.start).toBe('function');
  });
});
