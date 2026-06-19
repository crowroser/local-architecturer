import type { DockerService } from '../types/index.js';

export interface PortConflict {
  port: string;
  services: string[];
}

export interface VolumeAnalysis {
  source: string;
  target: string;
  service: string;
  readOnly: boolean;
  isLocalPath: boolean;
}

export interface DockerAnalysis {
  services: DockerService[];
  portConflicts: PortConflict[];
  volumes: VolumeAnalysis[];
  networks: string[];
  summary: {
    totalServices: number;
    totalPorts: number;
    totalVolumes: number;
    totalNetworks: number;
  };
}

export class PortConflictDetector {
  static analyze(services: DockerService[], networks: string[]): DockerAnalysis {
    const portConflicts = this.detectPortConflicts(services);
    const volumes = this.analyzeVolumes(services);
    
    return {
      services,
      portConflicts,
      volumes,
      networks,
      summary: {
        totalServices: services.length,
        totalPorts: services.reduce((sum, s) => sum + s.ports.length, 0),
        totalVolumes: volumes.length,
        totalNetworks: networks.length,
      },
    };
  }

  private static detectPortConflicts(services: DockerService[]): PortConflict[] {
    const portMap = new Map<string, string[]>();
    
    for (const service of services) {
      for (const port of service.ports) {
        const hostPort = port.split(':')[0];
        if (!portMap.has(hostPort)) {
          portMap.set(hostPort, []);
        }
        portMap.get(hostPort)!.push(service.name);
      }
    }
    
    const conflicts: PortConflict[] = [];
    for (const [port, serviceNames] of portMap) {
      if (serviceNames.length > 1) {
        conflicts.push({ port, services: serviceNames });
      }
    }
    
    return conflicts;
  }

  private static analyzeVolumes(services: DockerService[]): VolumeAnalysis[] {
    const volumes: VolumeAnalysis[] = [];
    
    for (const service of services) {
      for (const volume of service.volumes) {
        volumes.push({
          source: volume.source,
          target: volume.target,
          service: service.name,
          readOnly: volume.readOnly,
          isLocalPath: volume.source.startsWith('.') || volume.source.startsWith('/'),
        });
      }
    }
    
    return volumes;
  }
}
