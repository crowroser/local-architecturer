import path from 'node:path';
import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import fg from 'fast-glob';

export class PathResolver {
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = path.resolve(rootDir);
  }

  getRootDir(): string {
    return this.rootDir;
  }

  fileExistsSync(relativePath: string): boolean {
    const absolutePath = path.resolve(this.rootDir, relativePath);
    return fs.existsSync(absolutePath);
  }

  resolveFilePathSync(relativePath: string): string {
    const absolutePath = path.resolve(this.rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    return absolutePath;
  }

  async resolveFilePath(relativePath: string): Promise<string> {
    const absolutePath = path.resolve(this.rootDir, relativePath);
    await fsAsync.access(absolutePath);
    return absolutePath;
  }

  async findFiles(pattern: string): Promise<string[]> {
    return fg(pattern, {
      cwd: this.rootDir,
      absolute: true,
      onlyFiles: true,
    });
  }

  findFilesSync(pattern: string): string[] {
    return fg.sync(pattern, {
      cwd: this.rootDir,
      absolute: true,
      onlyFiles: true,
    });
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(this.rootDir, relativePath);
      await fsAsync.access(absolutePath);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      return false;
    }
  }

  async readFile(relativePath: string): Promise<string> {
    const absolutePath = path.resolve(this.rootDir, relativePath);
    return fsAsync.readFile(absolutePath, 'utf-8');
  }

  readFileSync(relativePath: string): string {
    const absolutePath = path.resolve(this.rootDir, relativePath);
    return fs.readFileSync(absolutePath, 'utf-8');
  }

  async readJson(relativePath: string): Promise<unknown> {
    const content = await this.readFile(relativePath);
    return JSON.parse(content);
  }

  getRelativePath(absolutePath: string): string {
    return path.relative(this.rootDir, absolutePath);
  }
}
