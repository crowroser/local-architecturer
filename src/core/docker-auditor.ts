import type { DockerService, DockerConfig } from '../types/index.js';

export interface SecurityIssue {
  service: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: string;
}

export interface SecurityAuditResult {
  issues: SecurityIssue[];
  score: number;
  summary: {
    totalServices: number;
    servicesWithIssues: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

export class DockerAuditor {
  static audit(dockerConfigs: DockerConfig[]): SecurityAuditResult {
    const issues: SecurityIssue[] = [];
    const allServices: DockerService[] = [];

    for (const config of dockerConfigs) {
      if (config.serviceDetails) {
        allServices.push(...config.serviceDetails);
      }
    }

    for (const service of allServices) {
      issues.push(...this.auditService(service));
    }

    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;
    const servicesWithIssues = new Set(issues.map(i => i.service)).size;

    let score = 100;
    score -= errors * 15;
    score -= warnings * 5;
    score -= info * 2;
    score = Math.max(0, score);

    return {
      issues,
      score,
      summary: {
        totalServices: allServices.length,
        servicesWithIssues,
        errors,
        warnings,
        info,
      },
    };
  }

  private static auditService(service: DockerService): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (!service.image && !service.build) {
      issues.push({
        service: service.name,
        severity: 'warning',
        message: 'No image or build context defined',
        category: 'configuration',
      });
    }

    if (service.ports.length === 0) {
      issues.push({
        service: service.name,
        severity: 'info',
        message: 'No ports exposed',
        category: 'networking',
      });
    }

    if (service.volumes.length === 0) {
      issues.push({
        service: service.name,
        severity: 'info',
        message: 'No volumes defined',
        category: 'storage',
      });
    }

    if (service.volumes.some(v => v.source === '/' || v.source.startsWith('/'))) {
      issues.push({
        service: service.name,
        severity: 'warning',
        message: 'Using absolute host path for volume mount',
        category: 'security',
      });
    }

    if (service.volumes.some(v => v.source.includes('..'))) {
      issues.push({
        service: service.name,
        severity: 'warning',
        message: 'Volume path contains relative traversal (..)',
        category: 'security',
      });
    }

    if (service.dependsOn.length === 0 && service.ports.length > 0) {
      issues.push({
        service: service.name,
        severity: 'info',
        message: 'Service exposes ports but has no dependencies',
        category: 'architecture',
      });
    }

    if (service.networks.length > 3) {
      issues.push({
        service: service.name,
        severity: 'info',
        message: `Service is connected to ${service.networks.length} networks`,
        category: 'complexity',
      });
    }

    if (service.environment['NODE_ENV'] === 'production' || 
        service.image?.includes('production')) {
      if (!service.volumes.some(v => v.readOnly)) {
        issues.push({
          service: service.name,
          severity: 'warning',
          message: 'Production service has no read-only volumes',
          category: 'security',
        });
      }
    }

    return issues;
  }

  static auditDeploySettings(dockerConfigs: DockerConfig[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    for (const config of dockerConfigs) {
      if (config.serviceDetails) {
        for (const service of config.serviceDetails) {
          if (!service.image?.includes('healthcheck') && 
              !config.path.includes('docker-compose')) {
            issues.push({
              service: service.name,
              severity: 'info',
              message: 'Consider adding healthcheck for production deployments',
              category: 'reliability',
            });
          }
        }
      }
    }

    return issues;
  }
}
