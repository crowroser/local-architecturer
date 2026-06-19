import { PathResolver } from './path-resolver.js';
import { DockerComposeParser } from '../parsers/docker-compose-parser.js';
import type { DockerConfig } from '../types/index.js';

export class DockerScanner {
  private resolver: PathResolver;
  private composeParser: DockerComposeParser;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.composeParser = new DockerComposeParser(resolver);
  }

  async scan(): Promise<DockerConfig[]> {
    const configs: DockerConfig[] = [];

    const dockerfiles = await this.findDockerfiles();
    for (const file of dockerfiles) {
      configs.push({
        type: 'dockerfile',
        path: this.resolver.getRelativePath(file),
        services: [],
      });
    }

    const composeFiles = await this.findComposeFiles();
    for (const file of composeFiles) {
      const relativePath = this.resolver.getRelativePath(file);
      const parsed = this.composeParser.parse(relativePath);

      if (parsed) {
        configs.push({
          type: 'docker-compose',
          path: relativePath,
          services: parsed.services.map(s => s.name),
          serviceDetails: parsed.services,
          networks: parsed.networks,
        });
      }
    }

    return configs;
  }

  private async findDockerfiles(): Promise<string[]> {
    return this.resolver.findFiles('**/Dockerfile');
  }

  private async findComposeFiles(): Promise<string[]> {
    return this.resolver.findFiles('**/docker-compose.{yml,yaml}');
  }
}
