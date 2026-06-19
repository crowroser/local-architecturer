import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import { GitHubActionsParser } from './github-actions-parser.js';
import { GitLabCIParser } from './gitlab-ci-parser.js';
import { JenkinsParser } from './jenkins-parser.js';
import { CircleCIParser } from './circleci-parser.js';
import type { Pipeline } from '../types/cicd.js';

export class CICDParser {
  private resolver: PathResolver;
  private logger: Logger;
  private parsers: Array<{ name: string; parser: { parseAll(): Promise<Pipeline[]> } }>;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[CICDParser] ');
    this.parsers = [
      { name: 'GitHub Actions', parser: new GitHubActionsParser(resolver) },
      { name: 'GitLab CI', parser: new GitLabCIParser(resolver) },
      { name: 'Jenkins', parser: new JenkinsParser(resolver) },
      { name: 'CircleCI', parser: new CircleCIParser(resolver) },
    ];
  }

  async parseAll(): Promise<Pipeline[]> {
    const allPipelines: Pipeline[] = [];

    for (const { name, parser } of this.parsers) {
      try {
        const pipelines = await parser.parseAll();
        if (pipelines.length > 0) {
          this.logger.debug(`Found ${pipelines.length} pipeline(s) from ${name}`);
          allPipelines.push(...pipelines);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse ${name}: ${error}`);
      }
    }

    return allPipelines;
  }
}
