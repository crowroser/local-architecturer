import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CircleCIParser } from '../../src/parsers/circleci-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('CircleCIParser', () => {
  let parser: CircleCIParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'circleci-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new CircleCIParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no .circleci/config.yml exists', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid .circleci/config.yml with jobs', async () => {
    await fs.mkdir(path.join(tempDir, '.circleci'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.circleci', 'config.yml'),
      `version: 2.1

jobs:
  build:
    docker:
      - image: cimg/node:20.0
    steps:
      - run: npm install
      - run: npm test
      - save_cache:
          key: deps-v1
          paths:
            - node_modules

  deploy:
    docker:
      - image: cimg/node:20.0
    steps:
      - run: npm run deploy

workflows:
  build-and-deploy:
    jobs:
      - build
      - deploy:
          requires:
            - build
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('circleci');
    expect(result[0].name).toBe('CircleCI Pipeline');
    expect(result[0].file).toBe('.circleci/config.yml');
    expect(result[0].jobs.length).toBe(2);

    const buildJob = result[0].jobs.find(j => j.name === 'build');
    expect(buildJob).toBeDefined();
    expect(buildJob!.runsOn).toBe('cimg/node:20.0');
    expect(buildJob!.steps.length).toBeGreaterThan(0);

    const deployJob = result[0].jobs.find(j => j.name === 'deploy');
    expect(deployJob).toBeDefined();
  });

  it('should parse empty config', async () => {
    await fs.mkdir(path.join(tempDir, '.circleci'), { recursive: true });
    await fs.writeFile(path.join(tempDir, '.circleci', 'config.yml'), '');
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should handle malformed YAML gracefully', async () => {
    await fs.mkdir(path.join(tempDir, '.circleci'), { recursive: true });
    await fs.writeFile(path.join(tempDir, '.circleci', 'config.yml'), 'version: 2.1\njobs: [\ninvalid');
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should extract workflow names as triggers', async () => {
    await fs.mkdir(path.join(tempDir, '.circleci'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.circleci', 'config.yml'),
      `version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:20.0
    steps:
      - run: echo test

workflows:
  nightly:
    jobs:
      - test
  release:
    jobs:
      - test
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].triggers).toContain('nightly');
    expect(result[0].triggers).toContain('release');
  });

  it('should parse run steps with simple format', async () => {
    await fs.mkdir(path.join(tempDir, '.circleci'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.circleci', 'config.yml'),
      `version: 2.1

jobs:
  build:
    docker:
      - image: cimg/node:20.0
    steps:
      - restore_cache:
          keys:
            - deps-v1
      - run: npm install
`
    );

    const result = await parser.parseAll();
    const buildJob = result[0].jobs.find(j => j.name === 'build');
    expect(buildJob!.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'restore_cache', action: 'restore_cache' }),
        expect.objectContaining({ name: 'npm install', command: 'npm install' }),
      ])
    );
  });
});
