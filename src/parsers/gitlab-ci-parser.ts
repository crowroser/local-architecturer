import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { Pipeline, PipelineJob, PipelineStep } from '../types/cicd.js';

export class GitLabCIParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[GitLabCIParser] ');
  }

  async parseAll(): Promise<Pipeline[]> {
    const filePath = path.join(this.resolver.getRootDir(), '.gitlab-ci.yml');

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const pipeline = this.parseFile(filePath);
    return pipeline ? [pipeline] : [];
  }

  private parseFile(filePath: string): Pipeline | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = yaml.load(content) as Record<string, unknown>;

      if (!config || typeof config !== 'object') return null;

      const stages = (config.stages as string[]) || [];
      const jobs = this.parseJobs(config, stages);

      return {
        platform: 'gitlab-ci',
        name: 'GitLab CI Pipeline',
        file: '.gitlab-ci.yml',
        triggers: ['push', 'merge_request'],
        jobs,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse .gitlab-ci.yml: ${error}`);
      return null;
    }
  }

  private parseJobs(config: Record<string, unknown>, stages: string[]): PipelineJob[] {
    const jobs: PipelineJob[] = [];
    const reservedKeys = new Set(['stages', 'variables', 'default', 'include', 'workflow']);

    for (const [key, value] of Object.entries(config)) {
      if (reservedKeys.has(key)) continue;
      if (typeof value !== 'object' || value === null) continue;

      const jobConfig = value as Record<string, unknown>;
      const steps: PipelineStep[] = [];

      if (Array.isArray(jobConfig.script)) {
        for (const cmd of jobConfig.script) {
          steps.push({ name: String(cmd).slice(0, 50), command: String(cmd) });
        }
      }

      const needs = Array.isArray(jobConfig.needs)
        ? (jobConfig.needs as unknown[]).map(n => {
            if (typeof n === 'string') return n;
            if (typeof n === 'object' && n !== null) return (n as Record<string, unknown>).job as string || '';
            return String(n);
          })
        : [];

      const stage = (jobConfig.stage as string) || '';
      if (stage && !stages.includes(stage)) {
        stages.push(stage);
      }

      jobs.push({
        name: key,
        steps,
        needs: needs.filter(Boolean),
        runsOn: jobConfig.image as string || '',
      });
    }

    return jobs;
  }
}
