import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitLabCIParser } from '../../src/parsers/gitlab-ci-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('GitLabCIParser', () => {
  let parser: GitLabCIParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitlab-ci-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new GitLabCIParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no .gitlab-ci.yml exists', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid .gitlab-ci.yml with jobs', async () => {
    await fs.writeFile(
      path.join(tempDir, '.gitlab-ci.yml'),
      `stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "20"

build:
  stage: build
  image: node:20
  script:
    - npm install
    - npm run build
  needs: []

test:
  stage: test
  image: node:20
  script:
    - npm test
  needs:
    - build

deploy:
  stage: deploy
  image: alpine
  script:
    - echo "deploying"
  needs:
    - test
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('gitlab-ci');
    expect(result[0].name).toBe('GitLab CI Pipeline');
    expect(result[0].file).toBe('.gitlab-ci.yml');
    expect(result[0].jobs.length).toBe(3);

    const buildJob = result[0].jobs.find(j => j.name === 'build');
    expect(buildJob).toBeDefined();
    expect(buildJob!.steps.length).toBe(2);
    expect(buildJob!.steps[0].command).toBe('npm install');
    expect(buildJob!.runsOn).toBe('node:20');

    const testJob = result[0].jobs.find(j => j.name === 'test');
    expect(testJob).toBeDefined();
    expect(testJob!.needs).toContain('build');

    const deployJob = result[0].jobs.find(j => j.name === 'deploy');
    expect(deployJob).toBeDefined();
    expect(deployJob!.needs).toContain('test');
  });

  it('should parse empty .gitlab-ci.yml', async () => {
    await fs.writeFile(path.join(tempDir, '.gitlab-ci.yml'), '');
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should handle malformed YAML gracefully', async () => {
    await fs.writeFile(path.join(tempDir, '.gitlab-ci.yml'), 'stages: [\ninvalid yaml [');
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse .gitlab-ci.yml with only stages defined', async () => {
    await fs.writeFile(
      path.join(tempDir, '.gitlab-ci.yml'),
      `stages:
  - build
  - deploy
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].jobs.length).toBe(0);
  });

  it('should parse jobs with needs as objects', async () => {
    await fs.writeFile(
      path.join(tempDir, '.gitlab-ci.yml'),
      `stages:
  - build

build:
  stage: build
  script:
    - make build

deploy:
  stage: deploy
  needs:
    - job: build
  script:
    - make deploy
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].jobs.length).toBe(2);
    const deployJob = result[0].jobs.find(j => j.name === 'deploy');
    expect(deployJob!.needs).toContain('build');
  });
});
