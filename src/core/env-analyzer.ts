import { PathResolver } from './path-resolver.js';
import { EnvParser } from '../parsers/env-parser.js';
import type { DockerConfig } from '../types/index.js';

export interface EnvCoverageIssue {
  service?: string;
  variable: string;
  type: 'missing_in_env' | 'unused_in_service' | 'missing_in_docker' | 'defined_but_not_used';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface EnvCoverageResult {
  definedVariables: string[];
  usedInCode: string[];
  usedInDocker: string[];
  missingInEnvFile: string[];
  unusedInServices: string[];
  issues: EnvCoverageIssue[];
  summary: {
    totalDefined: number;
    totalUsedInCode: number;
    totalUsedInDocker: number;
    totalIssues: number;
  };
}

export class EnvAnalyzer {
  private resolver: PathResolver;
  private parser: EnvParser;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.parser = new EnvParser(resolver);
  }

  async analyze(dockerConfigs: DockerConfig[]): Promise<EnvCoverageResult> {
    const envFiles = this.parser.parseExampleFiles();
    const definedVariables = new Set<string>();
    
    for (const file of envFiles) {
      for (const variable of file.variables) {
        definedVariables.add(variable.key);
      }
    }

    const sourceFiles = await this.findSourceFiles();
    const usedInCodeMap = this.parser.extractFromSourceCode(sourceFiles);
    const usedInCode = Array.from(usedInCodeMap.keys());

    const usedInDockerSet = new Set<string>();
    const serviceEnvMap = new Map<string, string[]>();
    
    for (const config of dockerConfigs) {
      if (config.serviceDetails) {
        for (const service of config.serviceDetails) {
          const serviceVars = Object.keys(service.environment);
          serviceEnvMap.set(service.name, serviceVars);
          for (const envVar of serviceVars) {
            usedInDockerSet.add(envVar);
          }
        }
      }
    }
    const usedInDocker = Array.from(usedInDockerSet);

    const issues: EnvCoverageIssue[] = [];

    for (const envVar of usedInCode) {
      if (!definedVariables.has(envVar)) {
        issues.push({
          variable: envVar,
          type: 'missing_in_env',
          severity: 'warning',
          message: `Variable "${envVar}" used in code but not defined in .env.example`,
        });
      }
    }

    for (const [service, vars] of serviceEnvMap) {
      for (const envVar of vars) {
        if (!definedVariables.has(envVar)) {
          issues.push({
            service,
            variable: envVar,
            type: 'missing_in_docker',
            severity: 'warning',
            message: `Service "${service}" uses "${envVar}" but it's not defined in .env.example`,
          });
        }
      }
    }

    for (const envVar of definedVariables) {
      if (!usedInCode.includes(envVar) && !usedInDocker.includes(envVar)) {
        issues.push({
          variable: envVar,
          type: 'defined_but_not_used',
          severity: 'info',
          message: `Variable "${envVar}" is defined but not used in code or Docker services`,
        });
      }
    }

    const missingInEnvFile = usedInCode.filter(v => !definedVariables.has(v));
    const unusedInServices = usedInDocker.filter(v => !definedVariables.has(v));

    return {
      definedVariables: Array.from(definedVariables),
      usedInCode,
      usedInDocker,
      missingInEnvFile,
      unusedInServices,
      issues,
      summary: {
        totalDefined: definedVariables.size,
        totalUsedInCode: usedInCode.length,
        totalUsedInDocker: usedInDocker.length,
        totalIssues: issues.length,
      },
    };
  }

  private async findSourceFiles(): Promise<string[]> {
    const patterns = [
      '**/*.{ts,tsx,js,jsx}',
      '**/*.{py}',
      '**/*.{sh,bash}',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const found = await this.resolver.findFiles(pattern);
      files.push(...found.map(f => this.resolver.getRelativePath(f)));
    }

    return files;
  }
}
