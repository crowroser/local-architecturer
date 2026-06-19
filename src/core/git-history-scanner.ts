import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { PathResolver } from './path-resolver.js';
import { Logger } from '../utils/logger.js';
import { DockerComposeParser } from '../parsers/docker-compose-parser.js';
import type { PackageInfo, DockerService } from '../types/index.js';

export interface GitHistorySnapshot {
  commitHash: string;
  timestamp: string;
  message: string;
  author: string;
  packages: PackageInfo[];
  services: DockerService[];
  packageCount: number;
  serviceCount: number;
}

export class GitHistoryScanner {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[GitHistoryScanner] ');
  }

  async scanHistory(maxCommits: number = 100): Promise<GitHistorySnapshot[]> {
    const commits = this.getRecentCommits(maxCommits);
    const snapshots: GitHistorySnapshot[] = [];

    for (const commit of commits) {
      const snapshot = this.createSnapshot(commit);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  private getRecentCommits(maxCommits: number): Array<{
    hash: string;
    timestamp: string;
    message: string;
    author: string;
  }> {
    try {
      const format = '%H|%aI|%s|%an';
      const output = execSync(
        `git log --oneline -${maxCommits} --format="${format}"`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: 10000 }
      );

      return output.trim().split('\n').filter(Boolean).map(line => {
        const [hash, timestamp, message, author] = line.split('|');
        return { hash, timestamp, message, author };
      });
    } catch (error) {
      this.logger.warn(`Failed to read git history: ${error}`);
      return [];
    }
  }

  private createSnapshot(commit: {
    hash: string;
    timestamp: string;
    message: string;
    author: string;
  }): GitHistorySnapshot | null {
    try {
      const packages = this.getPackagesAtCommit(commit.hash);
      const services = this.getServicesAtCommit(commit.hash);

      return {
        commitHash: commit.hash.slice(0, 8),
        timestamp: commit.timestamp,
        message: commit.message,
        author: commit.author,
        packages,
        services,
        packageCount: packages.length,
        serviceCount: services.length,
      };
    } catch (error) {
      this.logger.debug(`Skipping commit ${commit.hash.slice(0, 8)}: ${error}`);
      return null;
    }
  }

  private getPackagesAtCommit(hash: string): PackageInfo[] {
    try {
      const workspaceContent = execSync(
        `git show ${hash}:pnpm-workspace.yaml 2>/dev/null || echo ""`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: 5000 }
      );

      if (!workspaceContent.trim()) {
        return this.getPackageJsonAtCommit(hash);
      }

      return this.getPackageJsonAtCommit(hash);
    } catch {
      return [];
    }
  }

  private getPackageJsonAtCommit(hash: string): PackageInfo[] {
    try {
      const rootPkg = execSync(
        `git show ${hash}:package.json 2>/dev/null || echo "{}"`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: 5000 }
      );

      const pkg = JSON.parse(rootPkg);
      const packages: PackageInfo[] = [];

      if (pkg.name) {
        packages.push({
          name: pkg.name,
          version: pkg.version || '*',
          path: 'package.json',
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {}),
          type: 'node',
          language: 'javascript',
        });
      }

      return packages;
    } catch {
      return [];
    }
  }

  private getServicesAtCommit(hash: string): DockerService[] {
    try {
      const composeContent = execSync(
        `git show ${hash}:docker-compose.yml 2>/dev/null || git show ${hash}:docker-compose.yaml 2>/dev/null || echo ""`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: 5000 }
      );

      if (!composeContent.trim()) return [];

      const parser = new DockerComposeParser(this.resolver);
      const tempFile = `/tmp/compose-${hash}.yml`;
      fs.writeFileSync(tempFile, composeContent);

      const result = parser.parse(tempFile);
      fs.unlinkSync(tempFile);

      return result?.services || [];
    } catch {
      return [];
    }
  }
}
