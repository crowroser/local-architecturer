import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressServer } from '../../src/server/express-server.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('ExpressServer', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'express-test-'));
    
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create server instance', () => {
    const server = new ExpressServer({
      port: 3000,
      projectPath: tempDir,
    });
    expect(server).toBeDefined();
  });

  it('should have start method', () => {
    const server = new ExpressServer({
      port: 3000,
      projectPath: tempDir,
    });
    expect(typeof server.start).toBe('function');
  });
});
