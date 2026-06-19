import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import type { DockerService, VolumeMapping } from '../types/index.js';

export interface ParsedDockerCompose {
  services: DockerService[];
  networks: string[];
}

export class DockerComposeParser {
  private resolver: PathResolver;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
  }

  parse(filePath: string): ParsedDockerCompose | null {
    const absolutePath = path.join(this.resolver.getRootDir(), filePath);

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    
    let config: { services?: Record<string, unknown>; networks?: Record<string, unknown> };
    try {
      config = yaml.load(content) as { services?: Record<string, unknown>; networks?: Record<string, unknown> };
    } catch {
      return { services: [], networks: [] };
    }

    const services = this.parseServices(config?.services || {});
    const networks = Object.keys(config?.networks || {});

    return { services, networks };
  }

  private parseServices(servicesConfig: Record<string, unknown>): DockerService[] {
    return Object.entries(servicesConfig).map(([name, config]) => {
      const service = config as Record<string, unknown>;
      return {
        name,
        image: service.image as string | undefined,
        build: service.build as string | undefined,
        ports: this.parsePorts(service.ports),
        volumes: this.parseVolumes(service.volumes),
        dependsOn: this.parseDependsOn(service.depends_on),
        networks: this.parseNetworks(service.networks),
        environment: this.parseEnvironment(service.environment),
      };
    });
  }

  private parsePorts(ports: unknown): string[] {
    if (!Array.isArray(ports)) return [];
    return ports.map(p => String(p));
  }

  private parseVolumes(volumes: unknown): VolumeMapping[] {
    if (!Array.isArray(volumes)) return [];

    return volumes.map(v => {
      const str = String(v);
      const readOnly = str.endsWith(':ro');
      const cleanStr = readOnly ? str.slice(0, -3) : str;
      const [source, target] = cleanStr.split(':');

      return {
        source: source || '',
        target: target || '',
        readOnly,
      };
    });
  }

  private parseDependsOn(dependsOn: unknown): string[] {
    if (!dependsOn) return [];

    if (Array.isArray(dependsOn)) {
      return dependsOn.map(d => String(d));
    }

    if (typeof dependsOn === 'object') {
      return Object.keys(dependsOn);
    }

    return [];
  }

  private parseNetworks(networks: unknown): string[] {
    if (!networks) return [];

    if (Array.isArray(networks)) {
      return networks.map(n => String(n));
    }

    if (typeof networks === 'object') {
      return Object.keys(networks);
    }

    return [];
  }

  private parseEnvironment(env: unknown): Record<string, string> {
    if (!env) return {};

    if (Array.isArray(env)) {
      return env.reduce((acc, item) => {
        const str = String(item);
        const [key, ...value] = str.split('=');
        if (key) acc[key] = value.join('=');
        return acc;
      }, {} as Record<string, string>);
    }

    if (typeof env === 'object') {
      return env as Record<string, string>;
    }

    return {};
  }
}
