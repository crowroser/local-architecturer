import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { Pipeline, PipelineJob, PipelineStep } from '../types/cicd.js';

export class CircleCIParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[CircleCIParser] ');
  }

  async parseAll(): Promise<Pipeline[]> {
    const relativePath = '.circleci/config.yml';

    if (!this.resolver.fileExistsSync(relativePath)) {
      return [];
    }

    const pipeline = this.parseFile(relativePath);
    return pipeline ? [pipeline] : [];
  }

  private parseFile(relativePath: string): Pipeline | null {
    try {
      const content = this.resolver.readFileSync(relativePath);
      const config = yaml.load(content) as Record<string, unknown>;

      if (!config || typeof config !== 'object') return null;

      const triggers = this.extractTriggers(config);
      const jobs = this.parseJobs(config.jobs as Record<string, unknown> || {});

      return {
        platform: 'circleci',
        name: 'CircleCI Pipeline',
        file: '.circleci/config.yml',
        triggers,
        jobs,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse .circleci/config.yml: ${error}`);
      return null;
    }
  }

  private extractTriggers(config: Record<string, unknown>): string[] {
    const triggers: string[] = [];
    const workflows = config.workflows as Record<string, unknown> | undefined;

    if (workflows) {
      for (const [name, value] of Object.entries(workflows)) {
        if (name === 'version') continue;
        if (typeof value === 'object' && value !== null) {
          const jobs = (value as Record<string, unknown>).jobs;
          if (jobs) triggers.push(name);
        }
      }
    }

    if (triggers.length === 0) {
      triggers.push('push');
    }

    return triggers;
  }

  private parseJobs(jobsConfig: Record<string, unknown>): PipelineJob[] {
    const jobs: PipelineJob[] = [];

    for (const [name, config] of Object.entries(jobsConfig)) {
      if (typeof config !== 'object' || config === null) continue;

      const job = config as Record<string, unknown>;
      const steps = this.parseSteps(job.steps as Array<Record<string, unknown>> || []);
      const stepsFromDocker = this.parseDockerSteps(job.docker as Array<Record<string, unknown>> || []);

      jobs.push({
        name,
        steps: steps.length > 0 ? steps : stepsFromDocker,
        needs: [],
        runsOn: Array.isArray(job.docker)
          ? (job.docker[0] as Record<string, unknown>)?.image as string || ''
          : '',
      });
    }

    return jobs;
  }

  private parseSteps(stepsConfig: Array<Record<string, unknown>>): PipelineStep[] {
    const steps: PipelineStep[] = [];

    for (const step of stepsConfig) {
      if (step.run) {
        steps.push({
          name: (step.name as string) || String(step.run).slice(0, 50),
          command: String(step.run),
        });
      } else if (step['checkout']) {
        steps.push({ name: 'checkout', action: 'checkout' });
      } else if (step['restore_cache']) {
        steps.push({ name: 'restore_cache', action: 'restore_cache' });
      } else if (step['save_cache']) {
        steps.push({ name: 'save_cache', action: 'save_cache' });
      }
    }

    return steps;
  }

  private parseDockerSteps(dockerConfig: Array<Record<string, unknown>>): PipelineStep[] {
    const steps: PipelineStep[] = [];

    for (const docker of dockerConfig) {
      if (docker.image) {
        steps.push({
          name: `docker: ${docker.image}`,
          action: 'docker',
        });
      }
    }

    return steps;
  }
}
