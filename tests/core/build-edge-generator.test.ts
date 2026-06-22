import { describe, it, expect } from 'vitest';
import { BuildEdgeGenerator } from '../../src/core/build-edge-generator.js';
import type { DependencyGraph } from '../../src/types/index.js';
import type { Pipeline } from '../../src/types/cicd.js';

describe('BuildEdgeGenerator', () => {
  let generator: BuildEdgeGenerator;

  beforeEach(() => {
    generator = new BuildEdgeGenerator();
  });

  it('should generate build edges from CI/CD pipelines', () => {
    const pipelines: Pipeline[] = [
      {
        platform: 'github-actions',
        name: 'CI',
        file: '.github/workflows/ci.yml',
        triggers: ['push'],
        jobs: [
          {
            name: 'build',
            steps: [{ name: 'build', command: 'npm run build' }],
            needs: [],
          },
          {
            name: 'deploy',
            steps: [{ name: 'deploy', action: 'docker build app' }],
            needs: ['build'],
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'ci-github-actions-build', type: 'package', name: 'build' },
        { id: 'ci-github-actions-deploy', type: 'package', name: 'deploy' },
      ],
      edges: [],
    };

    const result = generator.generate(pipelines, graph);
    expect(result.length).toBeGreaterThanOrEqual(1);

    const dependsEdge = result.find(
      e => e.type === 'depends' && e.source === 'ci-github-actions-deploy'
    );
    expect(dependsEdge).toBeDefined();
    expect(dependsEdge!.target).toBe('ci-github-actions-build');
  });

  it('should generate build edges matching action to service nodes', () => {
    const pipelines: Pipeline[] = [
      {
        platform: 'gitlab-ci',
        name: 'CI',
        file: '.gitlab-ci.yml',
        triggers: ['push'],
        jobs: [
          {
            name: 'build',
            steps: [{ name: 'deploy', action: 'docker deploy frontend' }],
            needs: [],
          },
        ],
      },
    ];

    const graph: DependencyGraph = {
      nodes: [
        { id: 'ci-gitlab-ci-build', type: 'package', name: 'build' },
        { id: 'frontend', type: 'service', name: 'frontend' },
      ],
      edges: [],
    };

    const result = generator.generate(pipelines, graph);
    const buildsEdge = result.find(e => e.type === 'builds');
    expect(buildsEdge).toBeDefined();
    expect(buildsEdge!.source).toBe('ci-gitlab-ci-build');
    expect(buildsEdge!.target).toBe('frontend');
  });

  it('should return empty edges with no pipelines', () => {
    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = generator.generate([], graph);
    expect(result).toEqual([]);
  });

  it('should skip jobs not in graph', () => {
    const pipelines: Pipeline[] = [
      {
        platform: 'jenkins',
        name: 'CI',
        file: 'Jenkinsfile',
        triggers: ['manual'],
        jobs: [
          {
            name: 'build',
            steps: [{ name: 'build', command: 'make build' }],
            needs: [],
          },
        ],
      },
    ];

    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = generator.generate(pipelines, graph);
    expect(result).toEqual([]);
  });

  it('should handle pipeline with empty jobs', () => {
    const pipelines: Pipeline[] = [
      {
        platform: 'circleci',
        name: 'CI',
        file: '.circleci/config.yml',
        triggers: ['push'],
        jobs: [],
      },
    ];

    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = generator.generate(pipelines, graph);
    expect(result).toEqual([]);
  });

  it('should handle pipeline with empty steps', () => {
    const pipelines: Pipeline[] = [
      {
        platform: 'github-actions',
        name: 'CI',
        file: '.github/workflows/ci.yml',
        triggers: ['push'],
        jobs: [
          {
            name: 'test',
            steps: [],
            needs: [],
          },
        ],
      },
    ];

    const graph: DependencyGraph = { nodes: [], edges: [] };
    const result = generator.generate(pipelines, graph);
    expect(result).toEqual([]);
  });
});
