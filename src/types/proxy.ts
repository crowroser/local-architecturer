export interface ProxyConfig {
  platform: 'traefik' | 'nginx' | 'caddy';
  routes: ProxyRoute[];
}

export interface ProxyRoute {
  domain: string;
  port: string;
  targetService: string;
  network?: string;
  tls: boolean;
  stripPrefix?: string;
  middleware?: string[];
}
