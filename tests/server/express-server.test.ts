import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressServer } from '../../src/server/express-server.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('ExpressServer', () => {
  let tempDir: string;
  let server: ExpressServer;
  let port: number;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'express-test-'));
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-project', version: '1.0.0' }));
    port = 10000 + Math.floor(Math.random() * 50000);
    server = new ExpressServer({ port, projectPath: tempDir });
    await server.start();
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should respond to health check', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('should return graph data', async () => {
    const res = await fetch(`http://localhost:${port}/api/graph`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');
  });

  it('should return packages', async () => {
    const res = await fetch(`http://localhost:${port}/api/packages`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return circular dependency check', async () => {
    const res = await fetch(`http://localhost:${port}/api/circular`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('hasCircularDependencies');
  });

  it('should return docker analysis', async () => {
    const res = await fetch(`http://localhost:${port}/api/docker`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('services');
  });

  it('should return full analysis', async () => {
    const res = await fetch(`http://localhost:${port}/api/analyze`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('packages');
    expect(data).toHaveProperty('dependencies');
  });

  it('should validate commits parameter', async () => {
    const res = await fetch(`http://localhost:${port}/api/history?commits=abc`);
    expect(res.status).toBe(400);
  });

  it('should return history with valid commits param', async () => {
    const res = await fetch(`http://localhost:${port}/api/history?commits=10`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return CI/CD pipelines', async () => {
    const res = await fetch(`http://localhost:${port}/api/pipelines`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return database schemas', async () => {
    const res = await fetch(`http://localhost:${port}/api/database`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return proxy configurations', async () => {
    const res = await fetch(`http://localhost:${port}/api/proxy`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return data flows', async () => {
    const res = await fetch(`http://localhost:${port}/api/dataflow`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return docker audit results', async () => {
    const res = await fetch(`http://localhost:${port}/api/docker-audit`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('issues');
  });

  it('should return security boundaries', async () => {
    const res = await fetch(`http://localhost:${port}/api/security-boundaries`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('boundaries');
  });

  it('should return environment coverage', async () => {
    const res = await fetch(`http://localhost:${port}/api/env-coverage`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('issues');
    expect(data).toHaveProperty('summary');
  });

  it('should return AI profile', async () => {
    const res = await fetch(`http://localhost:${port}/api/ai-profile`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('models');
  });

  it('should reject cache invalidation without secret', async () => {
    const res = await fetch(`http://localhost:${port}/api/cache/invalidate`, { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('should accept cache invalidation with secret', async () => {
    const res = await fetch(`http://localhost:${port}/api/cache/invalidate`, {
      method: 'POST',
      headers: { 'x-cache-secret': 'archviz-cache-invalidate' },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('should reject cache invalidation with wrong secret', async () => {
    const res = await fetch(`http://localhost:${port}/api/cache/invalidate`, {
      method: 'POST',
      headers: { 'x-cache-secret': 'wrong-secret' },
    });
    expect(res.status).toBe(403);
  });

  it('should return health with projectPath', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    const data = await res.json();
    expect(data.projectPath).toBe(tempDir);
  });
});
