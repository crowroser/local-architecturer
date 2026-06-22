import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { ProxyConfig, ProxyRoute } from '../types/proxy.js';

export class CaddyParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[CaddyParser] ');
  }

  async parseAll(): Promise<ProxyConfig[]> {
    const files = this.resolver.findFilesSync('**/Caddyfile');
    const configs: ProxyConfig[] = [];

    for (const file of files) {
      const config = this.parseFile(file);
      if (config) configs.push(config);
    }

    return configs;
  }

  private parseFile(filePath: string): ProxyConfig | null {
    try {
      const content = this.resolver.readFileSync(this.resolver.getRelativePath(filePath));
      const routes = this.parseCaddyfile(content);

      if (routes.length === 0) return null;

      return {
        platform: 'caddy',
        routes,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseCaddyfile(content: string): ProxyRoute[] {
    const routes: ProxyRoute[] = [];
    const lines = content.split('\n');

    let currentDomain = '';
    let currentTls = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        const domainMatch = trimmed.match(/^(\S+)/);
        if (domainMatch) {
          currentDomain = domainMatch[1];
          currentTls = trimmed.includes('tls');
        }
        continue;
      }

      if (currentDomain) {
        const reverseProxyMatch = trimmed.match(/reverse_proxy\s+(\S+)(?:\s+port\s+(\d+))?/);
        if (reverseProxyMatch) {
          const target = reverseProxyMatch[1];
          const port = reverseProxyMatch[2] || '80';

          const service = target.split(':')[0];

          routes.push({
            domain: currentDomain,
            port,
            targetService: service,
            tls: currentTls,
          });
        }

        if (trimmed.includes('tls')) {
          currentTls = true;
        }
      }
    }

    return routes;
  }
}
