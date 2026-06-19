import type { DockerService, DockerConfig, VolumeMapping } from '../types/index.js';

export interface SecurityBoundary {
  sourceService: string;
  targetService: string;
  volumeSource: string;
  volumeTarget: string;
  permission: 'ro' | 'rw';
  riskLevel: 'safe' | 'warning' | 'dangerous';
  reason?: string;
}

export interface SecurityBoundaryResult {
  boundaries: SecurityBoundary[];
  summary: {
    totalVolumes: number;
    readOnly: number;
    readWrite: number;
    dangerous: number;
    warnings: number;
  };
}

const CRITICAL_PATHS = [
  '/',
  '/etc',
  '/var',
  '/usr',
  '/root',
  '/boot',
  '/proc',
  '/sys',
  '/dev',
  '/run',
  '/var/lib/docker',
  '/var/run/docker.sock',
];

const SENSITIVE_PATTERNS = [
  /\.env/,
  /credentials/i,
  /secrets/i,
  /\.key$/i,
  /\.pem$/i,
  /id_rsa/i,
  /docker\.sock/,
  /\.ssh/i,
  /\.gnupg/i,
  /shadow/i,
  /passwd/i,
];

export class SecurityBoundaryAnalyzer {
  analyze(dockerConfigs: DockerConfig[]): SecurityBoundaryResult {
    const boundaries: SecurityBoundary[] = [];

    for (const config of dockerConfigs) {
      if (!config.serviceDetails) continue;

      for (const service of config.serviceDetails) {
        const serviceBoundaries = this.analyzeService(service, config.serviceDetails);
        boundaries.push(...serviceBoundaries);
      }
    }

    const totalVolumes = boundaries.length;
    const readOnly = boundaries.filter(b => b.permission === 'ro').length;
    const readWrite = boundaries.filter(b => b.permission === 'rw').length;
    const dangerous = boundaries.filter(b => b.riskLevel === 'dangerous').length;
    const warnings = boundaries.filter(b => b.riskLevel === 'warning').length;

    return {
      boundaries,
      summary: {
        totalVolumes,
        readOnly,
        readWrite,
        dangerous,
        warnings,
      },
    };
  }

  private analyzeService(service: DockerService, allServices: DockerService[]): SecurityBoundary[] {
    const boundaries: SecurityBoundary[] = [];

    for (const volume of service.volumes) {
      const boundary = this.analyzeVolume(volume, service.name, allServices);
      if (boundary) boundaries.push(boundary);
    }

    return boundaries;
  }

  private analyzeVolume(
    volume: VolumeMapping,
    serviceName: string,
    allServices: DockerService[]
  ): SecurityBoundary | null {
    const permission = volume.readOnly ? 'ro' : 'rw';
    const riskLevel = this.assessRisk(volume, permission);

    let targetService = '';
    for (const otherService of allServices) {
      if (otherService.name === serviceName) continue;
      if (otherService.volumes.some(v => v.source === volume.source && v.target === volume.target)) {
        targetService = otherService.name;
        break;
      }
    }

    if (!targetService && !volume.source.includes('/')) {
      return null;
    }

    return {
      sourceService: serviceName,
      targetService: targetService || 'host',
      volumeSource: volume.source,
      volumeTarget: volume.target,
      permission,
      riskLevel,
      reason: this.getRiskReason(volume, permission, riskLevel),
    };
  }

  private assessRisk(volume: VolumeMapping, permission: 'ro' | 'rw'): 'safe' | 'warning' | 'dangerous' {
    const source = volume.source.toLowerCase();

    if (permission === 'ro') {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(source)) return 'warning';
      }
      return 'safe';
    }

    for (const path of CRITICAL_PATHS) {
      if (source === path || source.startsWith(path + '/')) {
        return 'dangerous';
      }
    }

    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(source)) return 'dangerous';
    }

    if (source.includes('/data') || source.includes('/storage') || source.includes('/backup')) {
      return 'warning';
    }

    return 'warning';
  }

  private getRiskReason(
    volume: VolumeMapping,
    permission: 'ro' | 'rw',
    riskLevel: 'safe' | 'warning' | 'dangerous'
  ): string | undefined {
    if (riskLevel === 'safe') return undefined;

    const source = volume.source.toLowerCase();

    if (riskLevel === 'dangerous') {
      if (source === '/var/run/docker.sock') return 'Docker socket mounted with write access';
      if (source.includes('.env') || source.includes('credentials') || source.includes('secrets')) {
        return 'Sensitive file mounted with write access';
      }
      for (const path of CRITICAL_PATHS) {
        if (source === path || source.startsWith(path + '/')) {
          return `Critical system path (${path}) mounted with write access`;
        }
      }
    }

    if (riskLevel === 'warning') {
      if (permission === 'rw') return 'Volume mounted with write access';
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(source)) return 'Sensitive file mounted (read-only)';
      }
    }

    return undefined;
  }
}
