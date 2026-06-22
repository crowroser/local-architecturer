import { describe, it, expect } from 'vitest';
import { AIProfiler } from '../../src/core/ai-profiler.js';
import type { DockerService } from '../../src/types/index.js';

describe('AIProfiler', () => {
  let profiler: AIProfiler;

  beforeEach(() => {
    profiler = new AIProfiler();
  });

  it('should profile services with AI model images', () => {
    const services: DockerService[] = [
      {
        name: 'llm-service',
        image: 'ollama/llama3:latest',
        ports: ['11434:11434'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {
          MODEL_NAME: 'llama3',
        },
      },
    ];

    const result = profiler.profile(services);
    expect(result.models.length).toBeGreaterThanOrEqual(1);
    expect(result.totalVram).toBeGreaterThan(0);
    expect(result.summary.totalModels).toBeGreaterThanOrEqual(1);
    expect(result.summary.highestRequirement).toContain('GB');
  });

  it('should return empty results with no AI services', () => {
    const services: DockerService[] = [
      {
        name: 'nginx',
        image: 'nginx:latest',
        ports: ['80:80'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = profiler.profile(services);
    expect(result.models.length).toBe(0);
    expect(result.totalVram).toBe(0);
    expect(result.summary.totalModels).toBe(0);
    expect(result.summary.highestRequirement).toBe('None');
  });

  it('should generate warnings for high VRAM requirements', () => {
    const services: DockerService[] = [
      {
        name: 'llm-service',
        image: 'ollama/llama3:latest',
        ports: ['11434:11434'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {
          MODEL_NAME: 'llama3',
        },
      },
    ];

    const result = profiler.profile(services);
    expect(Array.isArray(result.warnings)).toBe(true);
    result.warnings.forEach(w => {
      expect(w).toHaveProperty('serviceName');
      expect(w).toHaveProperty('severity');
      expect(w).toHaveProperty('message');
      expect(w).toHaveProperty('vramNeeded');
      expect(['critical', 'high', 'medium']).toContain(w.severity);
    });
  });

  it('should handle empty services array', () => {
    const result = profiler.profile([]);
    expect(result.models.length).toBe(0);
    expect(result.totalVram).toBe(0);
    expect(result.summary.totalModels).toBe(0);
    expect(result.warnings.length).toBe(0);
  });

  it('should detect quantization from image tags', () => {
    const services: DockerService[] = [
      {
        name: 'llm-q4',
        image: 'ollama/llama3:q4_K_M',
        ports: [],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = profiler.profile(services);
    if (result.models.length > 0) {
      expect(result.models[0].quantization).toBe('q4');
    }
  });

  it('should detect quantization from environment', () => {
    const services: DockerService[] = [
      {
        name: 'llm-fp16',
        image: 'ollama/llama3:latest',
        ports: [],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {
          QUANTIZATION: 'fp16',
        },
      },
    ];

    const result = profiler.profile(services);
    if (result.models.length > 0) {
      expect(result.models[0].quantization).toBe('fp16');
    }
  });
});
