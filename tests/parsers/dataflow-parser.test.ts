import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataFlowParser } from '../../src/parsers/dataflow-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { DockerService } from '../../src/types/index.js';

describe('DataFlowParser', () => {
  let parser: DataFlowParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dataflow-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new DataFlowParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should parse valid dataflow.yaml', async () => {
    await fs.writeFile(
      path.join(tempDir, 'dataflow.yaml'),
      `name: image-processing
description: OCR pipeline for document processing
triggers:
  - upload
  - api-call
steps:
  - name: intake
    type: input
    service: api-gateway
    description: Accept uploaded images
  - name: ocr
    type: process
    service: ocr-service
    description: Extract text from images
    latencyMs: 500
  - name: cache
    type: cache
    service: redis
  - name: export
    type: output
    service: s3-storage
`
    );

    const services: DockerService[] = [];
    const result = await parser.parseAll(services);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('image-processing');
    expect(result[0].description).toBe('OCR pipeline for document processing');
    expect(result[0].triggers).toContain('upload');
    expect(result[0].triggers).toContain('api-call');
    expect(result[0].steps.length).toBe(4);

    const intakeStep = result[0].steps.find(s => s.name === 'intake');
    expect(intakeStep).toBeDefined();
    expect(intakeStep!.type).toBe('input');
    expect(intakeStep!.service).toBe('api-gateway');
  });

  it('should auto-detect from Docker services', async () => {
    const services: DockerService[] = [
      {
        name: 'api-gateway',
        image: 'nginx:latest',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
      {
        name: 'ocr-service',
        image: 'tesseract-ocr:latest',
        ports: [],
        volumes: [],
        dependsOn: ['api-gateway'],
        networks: [],
        environment: {},
      },
      {
        name: 'redis-cache',
        image: 'redis:7',
        ports: [],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
      {
        name: 's3-export',
        image: 'minio/minio:latest',
        ports: [],
        volumes: [{ source: '/data/storage', target: '/data', readOnly: false }],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = await parser.parseAll(services);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('auto-detected-flow');
    expect(result[0].description).toBe('Automatically detected from Docker services');
    expect(result[0].steps.length).toBe(4);
    expect(result[0].triggers).toContain('docker-compose');
  });

  it('should return empty array when no services and no config file', async () => {
    const result = await parser.parseAll([]);
    expect(result).toEqual([]);
  });

  it('should handle empty steps in dataflow.yaml', async () => {
    await fs.writeFile(
      path.join(tempDir, 'dataflow.yaml'),
      `name: empty-flow
steps: []
`
    );

    const result = await parser.parseAll([]);
    expect(result.length).toBe(1);
    expect(result[0].steps.length).toBe(0);
  });

  it('should handle malformed YAML gracefully', async () => {
    await fs.writeFile(path.join(tempDir, 'dataflow.yaml'), 'name: [\ninvalid yaml');
    const result = await parser.parseAll([]);
    expect(result).toEqual([]);
  });

  it('should detect GPU latency from service images', async () => {
    const services: DockerService[] = [
      {
        name: 'gpu-service',
        image: 'nvidia/cuda:12.0',
        ports: [],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = await parser.parseAll(services);
    expect(result.length).toBe(1);
    const gpuStep = result[0].steps.find(s => s.name === 'gpu-service');
    expect(gpuStep).toBeDefined();
    expect(gpuStep!.latencyMs).toBeGreaterThan(10);
  });

  it('should detect low latency for redis services', async () => {
    const services: DockerService[] = [
      {
        name: 'cache',
        image: 'redis:7-alpine',
        ports: [],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = await parser.parseAll(services);
    const cacheStep = result[0].steps.find(s => s.name === 'cache');
    expect(cacheStep).toBeDefined();
    expect(cacheStep!.latencyMs).toBe(5);
  });
});
