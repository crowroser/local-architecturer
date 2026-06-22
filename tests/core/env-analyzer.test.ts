import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvAnalyzer } from '../../src/core/env-analyzer.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { DockerConfig } from '../../src/types/index.js';

describe('EnvAnalyzer', () => {
  let analyzer: EnvAnalyzer;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'env-analyzer-test-'));
    resolver = new PathResolver(tempDir);
    analyzer = new EnvAnalyzer(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should analyze env coverage with .env.example and Docker configs', async () => {
    await fs.writeFile(
      path.join(tempDir, '.env.example'),
      `DATABASE_URL=postgres://localhost/mydb
API_KEY=secret
REDIS_URL=redis://localhost
`
    );

    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app', 'redis'],
        serviceDetails: [
          {
            name: 'app',
            ports: ['3000:3000'],
            volumes: [],
            dependsOn: ['redis'],
            networks: [],
            environment: {
              DATABASE_URL: 'postgres://localhost/mydb',
              API_KEY: 'secret',
            },
          },
          {
            name: 'redis',
            ports: ['6379:6379'],
            volumes: [],
            dependsOn: [],
            networks: [],
            environment: {
              REDIS_URL: 'redis://localhost',
            },
          },
        ],
      },
    ];

    const result = await analyzer.analyze(dockerConfigs);
    expect(result.definedVariables.length).toBe(3);
    expect(result.usedInDocker.length).toBe(3);
    expect(result.summary.totalDefined).toBe(3);
    expect(result.summary.totalUsedInDocker).toBe(3);
  });

  it('should detect missing env vars in Docker services', async () => {
    await fs.writeFile(
      path.join(tempDir, '.env.example'),
      `DATABASE_URL=postgres://localhost/mydb
`
    );

    const dockerConfigs: DockerConfig[] = [
      {
        type: 'docker-compose',
        path: 'docker-compose.yml',
        services: ['app'],
        serviceDetails: [
          {
            name: 'app',
            ports: ['3000:3000'],
            volumes: [],
            dependsOn: [],
            networks: [],
            environment: {
              DATABASE_URL: 'postgres://localhost/mydb',
              UNDEFINED_VAR: 'value',
            },
          },
        ],
      },
    ];

    const result = await analyzer.analyze(dockerConfigs);
    const missingIssue = result.issues.find(
      i => i.type === 'missing_in_docker' && i.variable === 'UNDEFINED_VAR'
    );
    expect(missingIssue).toBeDefined();
    expect(missingIssue!.severity).toBe('warning');
  });

  it('should detect defined but unused variables', async () => {
    await fs.writeFile(
      path.join(tempDir, '.env.example'),
      `DATABASE_URL=postgres://localhost/mydb
UNUSED_VAR=something
`
    );

    const dockerConfigs: DockerConfig[] = [];

    const result = await analyzer.analyze(dockerConfigs);
    const unusedIssue = result.issues.find(
      i => i.type === 'defined_but_not_used' && i.variable === 'UNUSED_VAR'
    );
    expect(unusedIssue).toBeDefined();
    expect(unusedIssue!.severity).toBe('info');
  });

  it('should return empty results with no env files', async () => {
    const dockerConfigs: DockerConfig[] = [];

    const result = await analyzer.analyze(dockerConfigs);
    expect(result.definedVariables.length).toBe(0);
    expect(result.usedInCode.length).toBe(0);
    expect(result.usedInDocker.length).toBe(0);
  });

  it('should detect env vars used in source code', async () => {
    await fs.writeFile(
      path.join(tempDir, '.env.example'),
      `DATABASE_URL=postgres://localhost/mydb
API_KEY=secret
`
    );

    await fs.writeFile(
      path.join(tempDir, 'app.ts'),
      `const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
console.log(dbUrl, apiKey);
`
    );

    const result = await analyzer.analyze([]);
    expect(result.usedInCode.length).toBe(2);
    expect(result.usedInCode).toContain('DATABASE_URL');
    expect(result.usedInCode).toContain('API_KEY');
  });

  it('should detect code env vars not in .env.example', async () => {
    await fs.writeFile(
      path.join(tempDir, '.env.example'),
      `DATABASE_URL=postgres://localhost/mydb
`
    );

    await fs.writeFile(
      path.join(tempDir, 'app.ts'),
      `const dbUrl = process.env.DATABASE_URL;
const missing = process.env.MISSING_VAR;
`
    );

    const result = await analyzer.analyze([]);
    const missingIssue = result.issues.find(
      i => i.type === 'missing_in_env' && i.variable === 'MISSING_VAR'
    );
    expect(missingIssue).toBeDefined();
  });
});
