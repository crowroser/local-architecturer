import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';

export interface WorkspaceConfig {
  packages: string[];
}

export class WorkspaceParser {
  private resolver: PathResolver;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
  }

  parse(): WorkspaceConfig | null {
    const workspacePath = path.join(this.resolver.getRootDir(), 'pnpm-workspace.yaml');

    if (!fs.existsSync(workspacePath)) {
      return null;
    }

    const content = fs.readFileSync(workspacePath, 'utf-8');
    const config = yaml.load(content) as { packages?: string[] };

    return {
      packages: config.packages || [],
    };
  }
}
