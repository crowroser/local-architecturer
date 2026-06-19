import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import { TraefikParser } from './traefik-parser.js';
import { NginxParser } from './nginx-parser.js';
import { CaddyParser } from './caddy-parser.js';
import type { DockerService } from '../types/index.js';
import type { ProxyConfig } from '../types/proxy.js';

export class ProxyParser {
  private resolver: PathResolver;
  private logger: Logger;
  private traefikParser: TraefikParser;
  private nginxParser: NginxParser;
  private caddyParser: CaddyParser;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[ProxyParser] ');
    this.traefikParser = new TraefikParser();
    this.nginxParser = new NginxParser(resolver);
    this.caddyParser = new CaddyParser(resolver);
  }

  async parseAll(services: DockerService[]): Promise<ProxyConfig[]> {
    const allConfigs: ProxyConfig[] = [];

    const traefikConfig = this.traefikParser.parseFromServices(services);
    if (traefikConfig) {
      this.logger.debug(`Found Traefik config with ${traefikConfig.routes.length} routes`);
      allConfigs.push(traefikConfig);
    }

    try {
      const nginxConfigs = await this.nginxParser.parseAll();
      if (nginxConfigs.length > 0) {
        this.logger.debug(`Found ${nginxConfigs.length} Nginx config(s)`);
        allConfigs.push(...nginxConfigs);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse Nginx: ${error}`);
    }

    try {
      const caddyConfigs = await this.caddyParser.parseAll();
      if (caddyConfigs.length > 0) {
        this.logger.debug(`Found ${caddyConfigs.length} Caddy config(s)`);
        allConfigs.push(...caddyConfigs);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse Caddy: ${error}`);
    }

    return allConfigs;
  }
}
