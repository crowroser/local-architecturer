import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import { NginxParser } from '../parsers/nginx-parser.js';
import { TraefikParser } from '../parsers/traefik-parser.js';
import { CaddyParser } from '../parsers/caddy-parser.js';
import type { ProxyConfig, ProxyRoute } from '../types/proxy.js';
import type { DependencyNode, DependencyEdge } from '../types/index.js';

export interface GatewayInfo {
  name: string;
  type: 'api-gateway' | 'reverse-proxy' | 'load-balancer';
  routes: ProxyRoute[];
  middleware: string[];
}

export class GatewayDetector {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[GatewayDetector] ');
  }

  async detect(): Promise<GatewayInfo[]> {
    const gateways: GatewayInfo[] = [];

    const nginxParser = new NginxParser(this.resolver);
    const nginxConfigs = await nginxParser.parseAll();
    for (const config of nginxConfigs) {
      gateways.push({
        name: `nginx-${config.routes[0]?.domain || 'gateway'}`,
        type: this.classifyGateway(config),
        routes: config.routes,
        middleware: this.extractNginxMiddleware(config),
      });
    }

    const traefikParser = new TraefikParser(this.resolver);
    const traefikConfigs = await traefikParser.parseAll();
    for (const config of traefikConfigs) {
      gateways.push({
        name: `traefik-${config.routes[0]?.domain || 'gateway'}`,
        type: this.classifyGateway(config),
        routes: config.routes,
        middleware: this.extractTraefikMiddleware(config),
      });
    }

    const caddyParser = new CaddyParser(this.resolver);
    const caddyConfigs = await caddyParser.parseAll();
    for (const config of caddyConfigs) {
      gateways.push({
        name: `caddy-${config.routes[0]?.domain || 'gateway'}`,
        type: this.classifyGateway(config),
        routes: config.routes,
        middleware: [],
      });
    }

    return gateways;
  }

  toGraphNodes(gateways: GatewayInfo[]): DependencyNode[] {
    return gateways.map(gw => ({
      id: gw.name,
      type: 'gateway' as const,
      name: gw.name,
      metadata: {
        gatewayType: gw.type,
        routeCount: gw.routes.length,
        middleware: gw.middleware,
      },
    }));
  }

  toGraphEdges(gateways: GatewayInfo[]): DependencyEdge[] {
    const edges: DependencyEdge[] = [];

    for (const gw of gateways) {
      for (const route of gw.routes) {
        edges.push({
          source: gw.name,
          target: route.targetService,
          type: 'routes',
        });
      }
    }

    return edges;
  }

  private classifyGateway(config: ProxyConfig): GatewayInfo['type'] {
    const routeCount = config.routes.length;
    const hasTls = config.routes.some(r => r.tls);

    if (routeCount > 5) return 'load-balancer';
    if (hasTls || routeCount > 2) return 'api-gateway';
    return 'reverse-proxy';
  }

  private extractNginxMiddleware(config: ProxyConfig): string[] {
    const middleware: string[] = [];
    for (const route of config.routes) {
      if (route.middleware) {
        middleware.push(...route.middleware);
      }
    }
    return [...new Set(middleware)];
  }

  private extractTraefikMiddleware(config: ProxyConfig): string[] {
    const middleware: string[] = [];
    for (const route of config.routes) {
      if (route.middleware) {
        middleware.push(...route.middleware);
      }
    }
    return [...new Set(middleware)];
  }
}
