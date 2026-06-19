import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | null;

export interface WorkspaceConfig {
  packages: string[];
  packageManager: PackageManager;
}

export class WorkspaceParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[WorkspaceParser] ');
  }

  parse(): WorkspaceConfig | null {
    const pnpmResult = this.parsePnpm();
    if (pnpmResult) {
      this.logger.debug(`Detected pnpm workspace with ${pnpmResult.packages.length} patterns`);
      return pnpmResult;
    }

    const npmYarnResult = this.parseNpmOrYarn();
    if (npmYarnResult) {
      this.logger.debug(`Detected ${npmYarnResult.packageManager} workspace with ${npmYarnResult.packages.length} patterns`);
      return npmYarnResult;
    }

    this.logger.debug('No workspace configuration found');
    return null;
  }

  private parsePnpm(): WorkspaceConfig | null {
    const workspacePath = path.join(this.resolver.getRootDir(), 'pnpm-workspace.yaml');

    if (!fs.existsSync(workspacePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(workspacePath, 'utf-8');
      const config = yaml.load(content) as { packages?: string[] };

      return {
        packages: config.packages || [],
        packageManager: 'pnpm',
      };
    } catch (error) {
      this.logger.warn(`Failed to parse pnpm-workspace.yaml: ${error}`);
      return null;
    }
  }

  private parseNpmOrYarn(): WorkspaceConfig | null {
    const rootPkgPath = path.join(this.resolver.getRootDir(), 'package.json');

    if (!fs.existsSync(rootPkgPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(rootPkgPath, 'utf-8');
      const pkg = JSON.parse(content) as { workspaces?: string[] | { packages?: string[] } };

      if (!pkg.workspaces) {
        return null;
      }

      let packages: string[];

      if (Array.isArray(pkg.workspaces)) {
        packages = pkg.workspaces;
      } else if (pkg.workspaces.packages) {
        packages = pkg.workspaces.packages;
      } else {
        return null;
      }

      const packageManager = this.detectPackageManager();

      return {
        packages,
        packageManager,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse package.json: ${error}`);
      return null;
    }
  }

  private detectPackageManager(): PackageManager {
    if (fs.existsSync(path.join(this.resolver.getRootDir(), 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(this.resolver.getRootDir(), 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(this.resolver.getRootDir(), 'package-lock.json'))) {
      return 'npm';
    }
    return null;
  }
}
