import { PathResolver } from '../core/path-resolver.js';

export interface EnvVariable {
  key: string;
  value?: string;
  isRequired: boolean;
  source: string;
}

export interface EnvFile {
  path: string;
  variables: EnvVariable[];
}

export class EnvParser {
  private resolver: PathResolver;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
  }

  parseEnvFile(filePath: string): EnvFile | null {
    if (!this.resolver.fileExistsSync(filePath)) {
      return null;
    }

    const content = this.resolver.readFileSync(filePath);
    const variables = this.parseEnvContent(content, filePath);

    return {
      path: filePath,
      variables,
    };
  }

  parseExampleFiles(): EnvFile[] {
    const files = this.resolver.findFilesSync('**/.env.example');
    const result: EnvFile[] = [];

    for (const file of files) {
      const relativePath = this.resolver.getRelativePath(file);
      const parsed = this.parseEnvFile(relativePath);
      if (parsed) {
        result.push(parsed);
      }
    }

    if (result.length === 0) {
      const dotEnvFiles = this.resolver.findFilesSync('**/.env*');
      for (const file of dotEnvFiles) {
        const relativePath = this.resolver.getRelativePath(file);
        const parsed = this.parseEnvFile(relativePath);
        if (parsed) {
          result.push(parsed);
        }
      }
    }

    return result;
  }

  private parseEnvContent(content: string, source: string): EnvVariable[] {
    const variables: EnvVariable[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        variables.push({
          key,
          value: value || undefined,
          isRequired: !value,
          source,
        });
      }
    }

    return variables;
  }

  extractFromSourceCode(files: string[]): Map<string, string[]> {
    const envVars = new Map<string, string[]>();

    for (const file of files) {
      if (!this.resolver.fileExistsSync(file)) {
        continue;
      }

      const content = this.resolver.readFileSync(file);
      const varsInFile = this.extractVarsFromContent(content);
      
      for (const envVar of varsInFile) {
        const existing = envVars.get(envVar) || [];
        if (!existing.includes(file)) {
          existing.push(file);
          envVars.set(envVar, existing);
        }
      }
    }

    return envVars;
  }

  private extractVarsFromContent(content: string): string[] {
    const vars = new Set<string>();

    const nodePatterns = [
      /process\.env\.([A-Z_][A-Z0-9_]*)/g,
      /process\.env\[(['"])([A-Z_][A-Z0-9_]*)\1\]/g,
      /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    ];

    const pythonPatterns = [
      /os\.environ\.get\(['"]([A-Z_][A-Z0-9_]*)['"]/g,
      /os\.environ\[(['"])([A-Z_][A-Z0-9_]*)\1\]/g,
      /environ\.get\(['"]([A-Z_][A-Z0-9_]*)['"]/g,
    ];

    const bashPatterns = [
      /\$\{([A-Z_][A-Z0-9_]*)\}/g,
      /\$([A-Z_][A-Z0-9_]*)/g,
    ];

    const allPatterns = [...nodePatterns, ...pythonPatterns, ...bashPatterns];

    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1] || match[2];
        if (varName) {
          vars.add(varName);
        }
      }
    }

    return Array.from(vars);
  }
}
