import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';

export interface ComposerPackage {
  name: string;
  version?: string;
  path: string;
  dependencies: string[];
  devDependencies: string[];
  type: string;
  description?: string;
}

export interface ParsedComposerJson {
  name: string;
  type: string;
  description?: string;
  require: Record<string, string>;
  requireDev: Record<string, string>;
  autoload?: Record<string, unknown>;
}

export class ComposerParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[ComposerParser] ');
  }

  parse(filePath: string): ParsedComposerJson | null {
    if (!this.resolver.fileExistsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      return null;
    }

    try {
      const content = this.resolver.readFileSync(filePath);
      const config = JSON.parse(content);

      return {
        name: config.name || path.dirname(filePath).split('/').pop() || 'unknown',
        type: config.type || 'library',
        description: config.description,
        require: config.require || {},
        requireDev: config['require-dev'] || {},
        autoload: config.autoload,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private findComposerFiles(): string[] {
    return this.resolver.findFilesSync('**/composer.json');
  }

  parseAll(): ComposerPackage[] {
    const files = this.findComposerFiles();
    const packages: ComposerPackage[] = [];

    for (const file of files) {
      const relativePath = this.resolver.getRelativePath(file);
      const parsed = this.parse(relativePath);
      
      if (parsed) {
        packages.push({
          name: parsed.name,
          path: relativePath,
          dependencies: Object.keys(parsed.require),
          devDependencies: Object.keys(parsed.requireDev),
          type: parsed.type,
          description: parsed.description,
        });
      }
    }

    return packages;
  }

  private isInternalDependency(depName: string, packageNames: Set<string>): boolean {
    return packageNames.has(depName);
  }
}
