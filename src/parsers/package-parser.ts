import fs from 'node:fs';
import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DependencyNode } from '../types/index.js';

export interface ParsedPackage {
  name: string;
  version: string;
  path: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export class PackageParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[PackageParser] ');
  }

  parse(relativePath: string): ParsedPackage | null {
    const absolutePath = path.join(this.resolver.getRootDir(), relativePath);

    if (!fs.existsSync(absolutePath)) {
      this.logger.warn(`File not found: ${relativePath}`);
      return null;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(content);
    } catch (error) {
      this.logger.warn(`Failed to parse JSON in ${relativePath}: ${error}`);
      return null;
    }

    if (!pkg || typeof pkg !== 'object') {
      this.logger.warn(`Invalid package.json structure in ${relativePath}`);
      return null;
    }

    const result = {
      name: (pkg.name as string) || 'unknown',
      version: (pkg.version as string) || '0.0.0',
      path: relativePath,
      dependencies: (pkg.dependencies as Record<string, string>) || {},
      devDependencies: (pkg.devDependencies as Record<string, string>) || {},
    };

    this.logger.debug(`Parsed ${relativePath}: ${result.name}@${result.version}`);

    return result;
  }

  toNode(pkg: ParsedPackage): DependencyNode {
    return {
      id: pkg.name,
      type: 'package',
      name: pkg.name,
    };
  }
}
