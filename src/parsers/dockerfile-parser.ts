import fs from 'node:fs';
import { PathResolver } from '../core/path-resolver.js';

export interface DockerfileInfo {
  path: string;
  baseImage: string | null;
  exposedPorts: string[];
  buildArgs: string[];
  isMultiStage: boolean;
  stages: DockerfileStage[];
}

export interface DockerfileStage {
  from: string;
  as: string | null;
  commands: string[];
}

export class DockerfileParser {
  private resolver: PathResolver;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
  }

  parse(dockerfilePath: string): DockerfileInfo | null {
    try {
      const absolutePath = this.resolver.resolveFilePathSync(dockerfilePath);
      const content = fs.readFileSync(absolutePath, 'utf-8');
      
      return this.parseContent(content, dockerfilePath);
    } catch {
      return null;
    }
  }

  private parseContent(content: string, filePath: string): DockerfileInfo {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    const stages: DockerfileStage[] = [];
    let currentStage: DockerfileStage | null = null;
    const exposedPorts: string[] = [];
    const buildArgs: string[] = [];
    let baseImage: string | null = null;

    for (const line of lines) {
      const fromMatch = line.match(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?$/i);
      if (fromMatch) {
        currentStage = {
          from: fromMatch[1],
          as: fromMatch[2] || null,
          commands: [],
        };
        stages.push(currentStage);
        
        if (!baseImage) {
          baseImage = fromMatch[1];
        }
        continue;
      }

      const exposeMatch = line.match(/^EXPOSE\s+(.+)$/i);
      if (exposeMatch) {
        const ports = exposeMatch[1].split(/\s+/);
        exposedPorts.push(...ports);
        continue;
      }

      const argMatch = line.match(/^ARG\s+(\w+)/i);
      if (argMatch) {
        buildArgs.push(argMatch[1]);
        continue;
      }

      if (currentStage) {
        currentStage.commands.push(line);
      }
    }

    return {
      path: filePath,
      baseImage,
      exposedPorts,
      buildArgs,
      isMultiStage: stages.length > 1,
      stages,
    };
  }

  parseAll(): DockerfileInfo[] {
    const dockerfiles = this.resolver.findFilesSync('**/Dockerfile');
    const results: DockerfileInfo[] = [];

    for (const dockerfile of dockerfiles) {
      const relativePath = this.resolver.getRelativePath(dockerfile);
      const info = this.parse(relativePath);
      if (info) {
        results.push(info);
      }
    }

    return results;
  }
}
