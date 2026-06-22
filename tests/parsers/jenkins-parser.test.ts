import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JenkinsParser } from '../../src/parsers/jenkins-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('JenkinsParser', () => {
  let parser: JenkinsParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jenkins-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new JenkinsParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no Jenkinsfile exists', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid Jenkinsfile with stages', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Jenkinsfile'),
      `pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh('npm install')
        sh('npm run build')
      }
    }
    stage('Test') {
      steps {
        sh('npm test')
      }
    }
    stage('Deploy') {
      steps {
        sh('npm run deploy')
      }
    }
  }
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('jenkins');
    expect(result[0].name).toBe('Jenkins Pipeline');
    expect(result[0].file).toBe('Jenkinsfile');
    expect(result[0].jobs.length).toBe(3);

    const buildStage = result[0].jobs.find(j => j.name === 'Build');
    expect(buildStage).toBeDefined();
    expect(buildStage!.steps.length).toBe(2);
    expect(buildStage!.steps[0].command).toBe('npm install');
    expect(buildStage!.steps[1].command).toBe('npm run build');

    const testStage = result[0].jobs.find(j => j.name === 'Test');
    expect(testStage).toBeDefined();
    expect(testStage!.steps.length).toBe(1);
    expect(testStage!.steps[0].command).toBe('npm test');
  });

  it('should parse empty Jenkinsfile', async () => {
    await fs.writeFile(path.join(tempDir, 'Jenkinsfile'), '');
    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].jobs.length).toBe(0);
  });

  it('should detect cron trigger', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Jenkinsfile'),
      `pipeline {
  agent any
  triggers {
    cron('H 2 * * *')
  }
  stages {
    stage('Build') {
      steps {
        sh('echo build')
      }
    }
  }
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].triggers).toContain('cron');
  });

  it('should detect pollSCM trigger', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Jenkinsfile'),
      `pipeline {
  agent any
  triggers {
    pollSCM('H/5 * * * *')
  }
  stages {
    stage('Build') {
      steps {
        sh('echo build')
      }
    }
  }
}
`
    );

    const result = await parser.parseAll();
    expect(result[0].triggers).toContain('pollSCM');
  });

  it('should detect push trigger via githubPush', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Jenkinsfile'),
      `pipeline {
  agent any
  triggers {
    githubPush()
  }
  stages {
    stage('Build') {
      steps {
        sh('echo build')
      }
    }
  }
}
`
    );

    const result = await parser.parseAll();
    expect(result[0].triggers).toContain('push');
  });

  it('should default to manual trigger when none detected', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Jenkinsfile'),
      `pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh('echo build')
      }
    }
  }
}
`
    );

    const result = await parser.parseAll();
    expect(result[0].triggers).toContain('manual');
  });

  it('should parse stages with script blocks', async () => {
    await fs.writeFile(
      path.join(tempDir, 'Jenkinsfile'),
      `pipeline {
  agent any
  stages {
    stage('Deploy') {
      steps {
        script {
          sh('kubectl apply -f deployment.yaml')
          sh('kubectl rollout status deployment/app')
        }
      }
    }
  }
}
`
    );

    const result = await parser.parseAll();
    const deployStage = result[0].jobs.find(j => j.name === 'Deploy');
    expect(deployStage).toBeDefined();
    expect(deployStage!.steps.length).toBeGreaterThanOrEqual(2);
    expect(deployStage!.steps[0].command).toBe('kubectl apply -f deployment.yaml');
  });
});
