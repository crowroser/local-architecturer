import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DockerfileParser } from '../../src/parsers/dockerfile-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('DockerfileParser', () => {
  let parser: DockerfileParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dockerfile-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new DockerfileParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return null for non-existent Dockerfile', () => {
    const result = parser.parse('Dockerfile');
    expect(result).toBeNull();
  });

  it('should parse simple Dockerfile', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`
    );

    const result = parser.parse('Dockerfile');
    expect(result).not.toBeNull();
    expect(result!.baseImage).toBe('node:20-alpine');
    expect(result!.exposedPorts).toContain('3000');
    expect(result!.isMultiStage).toBe(false);
    expect(result!.stages.length).toBe(1);
  });

  it('should parse multi-stage Dockerfile', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      `FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]`
    );

    const result = parser.parse('Dockerfile');
    expect(result).not.toBeNull();
    expect(result!.isMultiStage).toBe(true);
    expect(result!.stages.length).toBe(2);
    expect(result!.stages[0].as).toBe('builder');
    expect(result!.stages[1].as).toBeNull();
  });

  it('should extract build args', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      `FROM node:20-alpine
ARG NODE_ENV=production
ARG APP_VERSION=1.0.0
WORKDIR /app
CMD ["echo", "hello"]`
    );

    const result = parser.parse('Dockerfile');
    expect(result).not.toBeNull();
    expect(result!.buildArgs).toContain('NODE_ENV');
    expect(result!.buildArgs).toContain('APP_VERSION');
  });

  it('should handle Dockerfile with comments', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      `# This is a comment
FROM node:20-alpine
# Another comment
EXPOSE 3000`
    );

    const result = parser.parse('Dockerfile');
    expect(result).not.toBeNull();
    expect(result!.baseImage).toBe('node:20-alpine');
    expect(result!.exposedPorts).toContain('3000');
  });

  it('should parse all Dockerfiles in project', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Dockerfile'),
      `FROM node:20-alpine
EXPOSE 3000`
    );
    await fs.mkdir(path.join(tempDir, 'services', 'api'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'services', 'api', 'Dockerfile'),
      `FROM python:3.11
EXPOSE 8000`
    );

    const results = parser.parseAll();
    expect(results.length).toBe(2);
  });
});
