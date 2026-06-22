import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { Pipeline, PipelineJob, PipelineStep } from '../types/cicd.js';

export class JenkinsParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[JenkinsParser] ');
  }

  async parseAll(): Promise<Pipeline[]> {
    const jenkinsfile = 'Jenkinsfile';

    if (!this.resolver.fileExistsSync(jenkinsfile)) {
      return [];
    }

    const pipeline = this.parseFile(jenkinsfile);
    return pipeline ? [pipeline] : [];
  }

  private parseFile(relativePath: string): Pipeline | null {
    try {
      const content = this.resolver.readFileSync(relativePath);
      const triggers = this.extractTriggers(content);
      const jobs = this.extractStages(content);

      return {
        platform: 'jenkins',
        name: 'Jenkins Pipeline',
        file: 'Jenkinsfile',
        triggers,
        jobs,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse Jenkinsfile: ${error}`);
      return null;
    }
  }

  private extractTriggers(content: string): string[] {
    const triggers: string[] = [];

    if (/cron\s*\(/.test(content)) triggers.push('cron');
    if (/pollSCM\s*\(/.test(content)) triggers.push('pollSCM');
    if (/upstream\s*\(/.test(content)) triggers.push('upstream');
    if (/githubPush\s*\(/.test(content)) triggers.push('push');

    if (triggers.length === 0) {
      triggers.push('manual');
    }

    return triggers;
  }

  private extractStages(content: string): PipelineJob[] {
    const jobs: PipelineJob[] = [];
    const stageRegex = /stage\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\{/g;
    let match;

    while ((match = stageRegex.exec(content)) !== null) {
      const stageName = match[1];
      const stageStart = match.index;
      const stageBody = this.extractBraceContent(content, stageStart);

      const steps = this.extractSteps(stageBody);

      jobs.push({
        name: stageName,
        steps,
        needs: [],
      });
    }

    return jobs;
  }

  private extractBraceContent(content: string, startIndex: number): string {
    let depth = 0;
    let found = false;

    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        depth++;
        found = true;
      } else if (content[i] === '}') {
        depth--;
        if (found && depth === 0) {
          return content.slice(startIndex, i + 1);
        }
      }
    }

    return content.slice(startIndex, startIndex + 500);
  }

  private extractSteps(stageBody: string): PipelineStep[] {
    const steps: PipelineStep[] = [];
    const shRegex = /sh\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;

    while ((match = shRegex.exec(stageBody)) !== null) {
      steps.push({
        name: match[1].slice(0, 50),
        command: match[1],
      });
    }

    const scriptRegex = /script\s*\{([^}]+)\}/g;
    while ((match = scriptRegex.exec(stageBody)) !== null) {
      const scriptContent = match[1];
      const innerShRegex = /sh\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      let innerMatch;

      while ((innerMatch = innerShRegex.exec(scriptContent)) !== null) {
        steps.push({
          name: innerMatch[1].slice(0, 50),
          command: innerMatch[1],
        });
      }
    }

    if (steps.length === 0) {
      steps.push({ name: 'execute', command: '' });
    }

    return steps;
  }
}
