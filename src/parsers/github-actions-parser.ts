import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { Pipeline, PipelineJob, PipelineStep } from '../types/cicd.js';

export class GitHubActionsParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[GitHubActionsParser] ');
  }

  async parseAll(): Promise<Pipeline[]> {
    const ymlFiles = this.resolver.findFilesSync('.github/workflows/*.yml');
    const yamlFiles = this.resolver.findFilesSync('.github/workflows/*.yaml');
    const files = [...ymlFiles, ...yamlFiles];

    if (files.length === 0) {
      return [];
    }

    const pipelines: Pipeline[] = [];

    for (const file of files) {
      const relativePath = this.resolver.getRelativePath(file);
      const fileName = relativePath.split('/').pop() || relativePath.split('\\').pop() || '';
      const pipeline = this.parseFile(relativePath, fileName);
      if (pipeline) {
        pipelines.push(pipeline);
      }
    }

    return pipelines;
  }

  private parseFile(relativePath: string, fileName: string): Pipeline | null {
    try {
      const content = this.resolver.readFileSync(relativePath);
      const config = yaml.load(content) as Record<string, unknown>;

      if (!config || typeof config !== 'object') return null;

      const name = (config.name as string) || fileName.replace(/\.ya?ml$/, '');
      const triggers = this.parseTriggers(config.on);
      const jobs = this.parseJobs(config.jobs as Record<string, unknown> || {});

      return {
        platform: 'github-actions',
        name,
        file: `.github/workflows/${fileName}`,
        triggers,
        jobs,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${fileName}: ${error}`);
      return null;
    }
  }

  private parseTriggers(onConfig: unknown): string[] {
    if (!onConfig) return [];

    if (typeof onConfig === 'string') return [onConfig];

    if (typeof onConfig === 'object') {
      return Object.keys(onConfig as Record<string, unknown>);
    }

    return [];
  }

  private parseJobs(jobsConfig: Record<string, unknown>): PipelineJob[] {
    const jobs: PipelineJob[] = [];

    for (const [name, config] of Object.entries(jobsConfig)) {
      const job = config as Record<string, unknown>;
      const steps = this.parseSteps(job.steps as Array<Record<string, unknown>> || []);
      const needs = this.parseNeeds(job.needs);
      const runsOn = Array.isArray(job['runs-on'])
        ? (job['runs-on'] as string[]).join(', ')
        : (job['runs-on'] as string) || '';

      jobs.push({ name, steps, needs, runsOn });
    }

    return jobs;
  }

  private parseSteps(stepsConfig: Array<Record<string, unknown>>): PipelineStep[] {
    return stepsConfig.map(step => ({
      name: (step.name as string) || '',
      action: step.uses as string | undefined,
      command: step.run as string | undefined,
    }));
  }

  private parseNeeds(needs: unknown): string[] {
    if (!needs) return [];
    if (Array.isArray(needs)) return needs.map(n => String(n));
    return [String(needs)];
  }
}
