import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import { PathResolver } from './path-resolver.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config.js';
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

  private sanitizeHash(hash: string): string {
    return hash.replace(/[^a-f0-9]/g, '');
  }

  async scanHistory(maxCommits: number = 100): Promise<GitHistorySnapshot[]> {
    const config = getConfig();
    const commits = this.getRecentCommits(maxCommits, config.gitTimeoutMs);
    const snapshots: GitHistorySnapshot[] = [];

    for (const commit of commits) {
      const snapshot = this.createSnapshot(commit);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  private getRecentCommits(maxCommits: number, timeoutMs: number): Array<{
    hash: string;
    timestamp: string;
    message: string;
    author: string;
  }> {
    try {
      const format = '%H|%aI|%s|%an';
      const output = execSync(
        `git log --oneline -${maxCommits} --format="${format}"`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: timeoutMs }
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
      return this.getPackageJsonAtCommit(hash);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to get packages at ${hash.slice(0, 8)}: ${message}`);
      return [];
    }
  }

  private getPackageJsonAtCommit(hash: string): PackageInfo[] {
    try {
      const config = getConfig();
      const safeHash = this.sanitizeHash(hash);
      const rootPkg = execSync(
        `git show ${safeHash}:package.json 2>/dev/null || echo "{}"`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: config.gitShortTimeoutMs }
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to get package.json at ${hash.slice(0, 8)}: ${message}`);
      return [];
    }
  }

  private getServicesAtCommit(hash: string): DockerService[] {
    try {
      const config = getConfig();
      const safeHash = this.sanitizeHash(hash);
      const composeContent = execSync(
        `git show ${safeHash}:docker-compose.yml 2>/dev/null || git show ${safeHash}:docker-compose.yaml 2>/dev/null || echo ""`,
        { cwd: this.resolver.getRootDir(), encoding: 'utf-8', timeout: config.gitShortTimeoutMs }
      );

      if (!composeContent.trim()) return [];

      const parser = new DockerComposeParser(this.resolver);
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `archviz-compose-${crypto.randomUUID()}.yml`);
      fs.writeFileSync(tempFile, composeContent);

      const result = parser.parse(tempFile);
      try { fs.unlinkSync(tempFile); } catch { /* ignore cleanup error */ }

      return result?.services || [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to get services at ${hash.slice(0, 8)}: ${message}`);
      return [];
    }
  }
}
