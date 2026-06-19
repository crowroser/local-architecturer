import type { ParsedPackage } from './package-parser.js';
import type { DependencyEdge } from '../types/index.js';

export class DependencyParser {
  private packageNames: Set<string>;

  constructor(packageNames: string[]) {
    this.packageNames = new Set(packageNames);
  }

  parseDependencies(pkg: ParsedPackage): DependencyEdge[] {
    const edges: DependencyEdge[] = [];

    for (const [depName, depVersion] of Object.entries(pkg.dependencies)) {
      if (this.isInternalDependency(depName, depVersion)) {
        edges.push({
          source: pkg.name,
          target: depName,
          type: 'depends',
        });
      }
    }

    for (const [depName, depVersion] of Object.entries(pkg.devDependencies)) {
      if (this.isInternalDependency(depName, depVersion)) {
        edges.push({
          source: pkg.name,
          target: depName,
          type: 'depends',
        });
      }
    }

    return edges;
  }

  private isInternalDependency(depName: string, depVersion: string): boolean {
    if (depVersion.startsWith('workspace:')) {
      return this.packageNames.has(depName);
    }

    return this.packageNames.has(depName);
  }
}
