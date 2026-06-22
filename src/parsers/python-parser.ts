import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';

export interface PythonPackage {
  name: string;
  version?: string;
  path: string;
  dependencies: string[];
  devDependencies: string[];
  type: string;
  description?: string;
}

export interface ParsedRequirements {
  packages: Array<{ name: string; version?: string; extras?: string[] }>;
  source: string;
}

export interface ParsedPyprojectToml {
  name?: string;
  version?: string;
  description?: string;
  dependencies: string[];
  devDependencies: string[];
  optionalDependencies: Record<string, string[]>;
}

export class PythonParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[PythonParser] ');
  }

  parseRequirements(filePath: string): ParsedRequirements | null {
    if (!this.resolver.fileExistsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      return null;
    }

    try {
      const content = this.resolver.readFileSync(filePath);
      const packages = this.parseRequirementsContent(content);

      return {
        packages,
        source: filePath,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseRequirementsContent(content: string): Array<{ name: string; version?: string; extras?: string[] }> {
    const packages: Array<{ name: string; version?: string; extras?: string[] }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) {
        continue;
      }

      const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[([^\]]+)\])?(?:[=<>!~]+(.+))?$/);
      if (match) {
        const name = match[1].toLowerCase();
        const extras = match[2] ? match[2].split(',').map(e => e.trim()) : undefined;
        const version = match[3] || undefined;

        packages.push({ name, version, extras });
      }
    }

    return packages;
  }

  parsePyprojectToml(filePath: string): ParsedPyprojectToml | null {
    if (!this.resolver.fileExistsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      return null;
    }

    try {
      const content = this.resolver.readFileSync(filePath);
      const config = this.parseToml(content);

      const dependencies: string[] = [];
      const devDependencies: string[] = [];
      const optionalDependencies: Record<string, string[]> = {};

      const project = config.project as Record<string, unknown> | undefined;
      const tool = config.tool as Record<string, unknown> | undefined;
      const poetry = tool?.poetry as Record<string, unknown> | undefined;

      if (project?.dependencies && Array.isArray(project.dependencies)) {
        for (const dep of project.dependencies) {
          dependencies.push(String(dep).split(/[>=<]/)[0].trim());
        }
      }

      if (project?.['optional-dependencies']) {
        const optional = project['optional-dependencies'] as Record<string, unknown>;
        for (const [group, deps] of Object.entries(optional)) {
          if (Array.isArray(deps)) {
            optionalDependencies[group] = deps.map(d => String(d).split(/[>=<]/)[0].trim());
          } else if (typeof deps === 'string') {
            optionalDependencies[group] = [deps.split(/[>=<]/)[0].trim()];
          }
        }
      }

      if (poetry) {
        if (poetry.dependencies && typeof poetry.dependencies === 'object') {
          for (const [name] of Object.entries(poetry.dependencies as Record<string, unknown>)) {
            if (name !== 'python') {
              dependencies.push(name);
            }
          }
        }

        if (poetry['dev-dependencies'] && typeof poetry['dev-dependencies'] === 'object') {
          for (const [name] of Object.entries(poetry['dev-dependencies'] as Record<string, unknown>)) {
            devDependencies.push(name);
          }
        }

        const group = poetry.group as Record<string, unknown> | undefined;
        if (group?.dev && typeof group.dev === 'object') {
          const devGroup = group.dev as Record<string, unknown>;
          if (devGroup.dependencies && typeof devGroup.dependencies === 'object') {
            for (const [name] of Object.entries(devGroup.dependencies as Record<string, unknown>)) {
              devDependencies.push(name);
            }
          }
        }
      }

      return {
        name: (project?.name || poetry?.name) as string | undefined,
        version: (project?.version || poetry?.version) as string | undefined,
        description: (project?.description || poetry?.description) as string | undefined,
        dependencies,
        devDependencies,
        optionalDependencies,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseToml(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const lines = content.split('\n');
    let currentSection: Record<string, unknown> = result;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        const sectionPath = sectionMatch[1].split('.').map(s => s.trim().replace(/['"]/g, ''));
        currentSection = result;
        
        for (let j = 0; j < sectionPath.length; j++) {
          const part = sectionPath[j];
          if (!currentSection[part]) {
            currentSection[part] = {};
          }
          currentSection = currentSection[part] as Record<string, unknown>;
        }
        i++;
        continue;
      }

      const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let valueStr = kvMatch[2];
        
        if (valueStr.includes('[') && !valueStr.includes(']')) {
          while (i < lines.length - 1 && !lines[i].includes(']')) {
            i++;
            valueStr += '\n' + lines[i];
          }
        }
        
        const value = this.parseTomlValue(valueStr);
        currentSection[key] = value;
      }
      
      i++;
    }

    return result;
  }

  private parseTomlValue(value: string): unknown {
    const trimmed = value.trim();

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      
      const items: unknown[] = [];
      let current = '';
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        
        if ((char === '"' || char === "'") && !inString) {
          inString = true;
          stringChar = char;
          current += char;
        } else if (char === stringChar && inString) {
          inString = false;
          stringChar = '';
          current += char;
        } else if (char === ',' && !inString) {
          items.push(this.parseTomlValue(current.trim()));
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current.trim()) {
        items.push(this.parseTomlValue(current.trim()));
      }
      
      return items;
    }

    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    const num = Number(trimmed);
    if (!isNaN(num)) return num;

    return trimmed;
  }

  findPythonFiles(): string[] {
    const requirements = this.resolver.findFilesSync('**/requirements*.txt');
    const pyproject = this.resolver.findFilesSync('**/pyproject.toml');
    return [...requirements, ...pyproject];
  }

  parseAll(): PythonPackage[] {
    const files = this.findPythonFiles();
    const packages: PythonPackage[] = [];

    for (const file of files) {
      const relativePath = this.resolver.getRelativePath(file);
      const isRequirements = file.includes('requirements');
      const isPyproject = file.includes('pyproject.toml');

      if (isRequirements) {
        const parsed = this.parseRequirements(relativePath);
        if (parsed) {
          const dirName = path.dirname(relativePath).split('/').pop() || 'python-package';
          packages.push({
            name: dirName,
            path: relativePath,
            dependencies: parsed.packages.map(p => p.name),
            devDependencies: [],
            type: 'python-package',
          });
        }
      } else if (isPyproject) {
        const parsed = this.parsePyprojectToml(relativePath);
        if (parsed) {
          packages.push({
            name: parsed.name || path.dirname(relativePath).split('/').pop() || 'python-package',
            version: parsed.version,
            path: relativePath,
            dependencies: parsed.dependencies,
            devDependencies: parsed.devDependencies,
            type: 'python-package',
            description: parsed.description,
          });
        }
      }
    }

    return packages;
  }
}
