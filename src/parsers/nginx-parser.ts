import fs from 'node:fs';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { ProxyConfig, ProxyRoute } from '../types/proxy.js';

export class NginxParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[NginxParser] ');
  }

  async parseAll(): Promise<ProxyConfig[]> {
    const configs: ProxyConfig[] = [];
    const files = await this.findNginxFiles();

    for (const file of files) {
      const config = this.parseFile(file);
      if (config) configs.push(config);
    }

    return configs;
  }

  private async findNginxFiles(): Promise<string[]> {
    const patterns = [
      '**/nginx.conf',
      '**/conf.d/*.conf',
      '**/sites-enabled/*',
      '**/sites-available/*',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const found = this.resolver.findFilesSync(pattern);
      files.push(...found);
    }

    return files;
  }

  private parseFile(filePath: string): ProxyConfig | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const routes = this.parseNginxConfig(content);

      if (routes.length === 0) return null;

      return {
        platform: 'nginx',
        routes,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseNginxConfig(content: string): ProxyRoute[] {
    const routes: ProxyRoute[] = [];

    const serverBlocks = this.extractServerBlocks(content);

    for (const block of serverBlocks) {
      const serverName = this.extractDirective(block, 'server_name');
      const listenPort = this.extractListenPort(block);
      const proxyPass = this.extractDirective(block, 'proxy_pass');
      const ssl = block.includes('ssl ') || block.includes('listen.*443');

      if (serverName && proxyPass) {
        const target = this.parseProxyPass(proxyPass);
        routes.push({
          domain: serverName,
          port: listenPort,
          targetService: target.service,
          tls: ssl,
          stripPrefix: target.stripPrefix,
        });
      }
    }

    return routes;
  }

  private extractServerBlocks(content: string): string[] {
    const blocks: string[] = [];
    let depth = 0;
    let start = -1;

    for (let i = 0; i < content.length; i++) {
      if (content.substring(i, i + 6) === 'server') {
        const afterServer = content.substring(i + 6).trimStart();
        if (afterServer.startsWith('{')) {
          start = i;
          depth = 1;
          i += 6;
          continue;
        }
      }

      if (start >= 0) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            blocks.push(content.substring(start, i + 1));
            start = -1;
          }
        }
      }
    }

    return blocks;
  }

  private extractDirective(block: string, directive: string): string {
    const regex = new RegExp(`${directive}\\s+([^;]+);`);
    const match = block.match(regex);
    return match?.[1]?.trim() || '';
  }

  private extractListenPort(block: string): string {
    const listenMatch = block.match(/listen\s+(\d+)/);
    return listenMatch?.[1] || '80';
  }

  private parseProxyPass(proxyPass: string): { service: string; stripPrefix?: string } {
    const upstreamMatch = proxyPass.match(/https?:\/\/([^/\s]+)(:\d+)?(\/.*)?/);
    if (!upstreamMatch) return { service: proxyPass };

    const host = upstreamMatch[1];
    const path = upstreamMatch[3];

    let stripPrefix: string | undefined;
    if (path && path !== '/') {
      stripPrefix = path;
    }

    return {
      service: host.split(':')[0],
      stripPrefix,
    };
  }
}
