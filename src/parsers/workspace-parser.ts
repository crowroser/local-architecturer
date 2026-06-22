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
    if (!this.resolver.fileExistsSync('pnpm-workspace.yaml')) {
      return null;
    }

    try {
      const content = this.resolver.readFileSync('pnpm-workspace.yaml');
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
    if (!this.resolver.fileExistsSync('package.json')) {
      return null;
    }

    try {
      const content = this.resolver.readFileSync('package.json');
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
    if (this.resolver.fileExistsSync('pnpm-lock.yaml')) {
      return 'pnpm';
    }
    if (this.resolver.fileExistsSync('yarn.lock')) {
      return 'yarn';
    }
    if (this.resolver.fileExistsSync('package-lock.json')) {
      return 'npm';
    }
    return null;
  }
}
