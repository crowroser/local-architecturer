import fs from 'node:fs';
import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
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

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
  }

  parse(relativePath: string): ParsedPackage | null {
    const absolutePath = path.join(this.resolver.getRootDir(), relativePath);

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const pkg = JSON.parse(content);

    return {
      name: pkg.name || 'unknown',
      version: pkg.version || '0.0.0',
      path: relativePath,
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  }

  toNode(pkg: ParsedPackage): DependencyNode {
    return {
      id: pkg.name,
      type: 'package',
      name: pkg.name,
    };
  }
}
