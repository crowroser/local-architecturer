import type { DockerService } from '../types/index.js';
import type { ProxyConfig, ProxyRoute } from '../types/proxy.js';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';

export class TraefikParser {
  private resolver?: PathResolver;
  private logger: Logger;

  constructor(resolver?: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[TraefikParser] ');
  }

  parseFromServices(services: DockerService[]): ProxyConfig | null {
    const routes: ProxyRoute[] = [];

    for (const service of services) {
      const serviceRoutes = this.extractRoutes(service);
      routes.push(...serviceRoutes);
    }

    if (routes.length === 0) return null;

    return {
      platform: 'traefik',
      routes,
    };
  }

  async parseAll(): Promise<ProxyConfig[]> {
    if (!this.resolver) return [];

    const configs: ProxyConfig[] = [];
    const files = this.resolver.findFilesSync('**/traefik.yml');
    const files2 = this.resolver.findFilesSync('**/traefik.yaml');

    for (const file of [...files, ...files2]) {
      void file;
    }

    return configs;
  }

  private extractRoutes(service: DockerService): ProxyRoute[] {
    const routes: ProxyRoute[] = [];
    const labels = service.environment;

    const routerPrefixes = new Set<string>();
    for (const key of Object.keys(labels)) {
      const match = key.match(/^traefik\.http\.routers\.(\w+)\./);
      if (match) routerPrefixes.add(match[1]);
    }

    for (const routerName of routerPrefixes) {
      const ruleKey = `traefik.http.routers.${routerName}.rule`;
      const portKey = `traefik.http.services.${routerName}.loadbalancer.server.port`;
      const tlsKey = `traefik.http.routers.${routerName}.tls`;
      const networkKey = `traefik.docker.network`;
      const middlewareKey = `traefik.http.routers.${routerName}.middlewares`;

      const rule = labels[ruleKey] || '';
      const domain = this.extractDomain(rule);
      const port = labels[portKey] || '';
      const tls = tlsKey in labels;
      const network = labels[networkKey];
      const middleware = this.parseMiddleware(labels[middlewareKey]);

      if (domain) {
        routes.push({
          domain,
          port: port || service.ports[0]?.split(':')[1] || '80',
          targetService: service.name,
          network,
          tls,
          middleware,
        });
      }
    }

    if (routes.length === 0 && service.ports.length > 0) {
      const portLabel = Object.entries(labels).find(([k]) => k.includes('traefik.http.services'));
      if (portLabel) {
        const domain = this.extractDomainFromLabels(labels);
        if (domain) {
          routes.push({
            domain,
            port: service.ports[0]?.split(':')[1] || '80',
            targetService: service.name,
            tls: false,
          });
        }
      }
    }

    return routes;
  }

  private parseMiddleware(value: string | undefined): string[] | undefined {
    if (!value) return undefined;
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }

  private extractDomain(rule: string): string {
    const hostMatch = rule.match(/Host\(`([^`]+)`\)/);
    if (hostMatch) return hostMatch[1];

    const hostRegexpMatch = rule.match(/HostRegexp\(`[^`]*\{[^}]+:([^}]+)\}[^`]*`\)/);
    if (hostRegexpMatch) return hostRegexpMatch[1];

    return '';
  }

  private extractDomainFromLabels(labels: Record<string, string>): string {
    for (const [key, value] of Object.entries(labels)) {
      if (key.includes('traefik.http.routers') && key.includes('rule')) {
        return this.extractDomain(value);
      }
    }
    return '';
  }
}
