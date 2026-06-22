import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';

export interface KubernetesResource {
  kind: string;
  name: string;
  namespace: string;
  labels: Record<string, string>;
  spec: Record<string, unknown>;
}

export interface KubernetesDeployment extends KubernetesResource {
  kind: 'Deployment';
  replicas: number;
  containers: ContainerInfo[];
}

export interface KubernetesService extends KubernetesResource {
  kind: 'Service';
  serviceType: string;
  ports: ServicePort[];
}

export interface KubernetesIngress extends KubernetesResource {
  kind: 'Ingress';
  rules: IngressRule[];
}

export interface KubernetesConfigMap extends KubernetesResource {
  kind: 'ConfigMap';
  data: Record<string, string>;
}

export interface KubernetesSecret extends KubernetesResource {
  kind: 'Secret';
  type: string;
  keys: string[];
}

export interface ContainerInfo {
  name: string;
  image: string;
  ports: number[];
  env: Record<string, string>;
}

export interface ServicePort {
  name: string;
  port: number;
  targetPort: number;
  protocol: string;
}

export interface IngressRule {
  host: string;
  paths: IngressPath[];
}

export interface IngressPath {
  path: string;
  serviceName: string;
  servicePort: number;
}

export interface KubernetesAnalysis {
  deployments: KubernetesDeployment[];
  services: KubernetesService[];
  ingresses: KubernetesIngress[];
  configMaps: KubernetesConfigMap[];
  secrets: KubernetesSecret[];
  connections: KubernetesConnection[];
}

export interface KubernetesConnection {
  from: string;
  to: string;
  type: 'service-to-deployment' | 'ingress-to-service' | 'deployment-to-configmap' | 'deployment-to-secret';
}

export class KubernetesParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[KubernetesParser] ');
  }

  async parseAll(): Promise<KubernetesAnalysis> {
    const files = await this.findKubernetesFiles();
    const analysis: KubernetesAnalysis = {
      deployments: [],
      services: [],
      ingresses: [],
      configMaps: [],
      secrets: [],
      connections: [],
    };

    for (const file of files) {
      const resources = this.parseFile(file);
      if (resources) {
        this.categorizeResources(resources, analysis);
      }
    }

    analysis.connections = this.detectConnections(analysis);
    return analysis;
  }

  private async findKubernetesFiles(): Promise<string[]> {
    const patterns = [
      '**/k8s/**/*.yaml',
      '**/k8s/**/*.yml',
      '**/kubernetes/**/*.yaml',
      '**/kubernetes/**/*.yml',
      '**/deploy/**/*.yaml',
      '**/deploy/**/*.yml',
      '**/manifests/**/*.yaml',
      '**/manifests/**/*.yml',
      '**/*.k8s.yaml',
      '**/*.k8s.yml',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const found = this.resolver.findFilesSync(pattern);
      files.push(...found);
    }

    return [...new Set(files)];
  }

  private parseFile(filePath: string): KubernetesResource[] | null {
    try {
      const relativePath = this.resolver.getRelativePath(filePath);
      const content = this.resolver.readFileSync(relativePath);
      const documents = yaml.loadAll(content) as Array<Record<string, unknown>>;
      const resources: KubernetesResource[] = [];

      for (const doc of documents) {
        if (!doc || typeof doc !== 'object') continue;

        const resource = this.parseDocument(doc);
        if (resource) {
          resources.push(resource);
        }
      }

      return resources.length > 0 ? resources : null;
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseDocument(doc: Record<string, unknown>): KubernetesResource | null {
    const kind = doc.kind as string;
    const metadata = doc.metadata as Record<string, unknown> | undefined;
    const spec = doc.spec as Record<string, unknown> | undefined;

    if (!kind || !metadata) return null;

    const name = (metadata.name as string) || 'unknown';
    const namespace = (metadata.namespace as string) || 'default';
    const labels = (metadata.labels as Record<string, string>) || {};

    switch (kind) {
      case 'Deployment':
        return this.parseDeployment(name, namespace, labels, spec);
      case 'Service':
        return this.parseService(name, namespace, labels, spec);
      case 'Ingress':
        return this.parseIngress(name, namespace, labels, spec);
      case 'ConfigMap':
        return this.parseConfigMap(name, namespace, labels, doc.data as Record<string, string>);
      case 'Secret':
        return this.parseSecret(name, namespace, labels, doc);
      default:
        return null;
    }
  }

  private parseDeployment(
    name: string,
    namespace: string,
    labels: Record<string, string>,
    spec: Record<string, unknown> | undefined
  ): KubernetesDeployment {
    const specObj = spec || {};
    const replicas = (specObj.replicas as number) || 1;
    const selector = specObj.selector as Record<string, unknown> | undefined;
    const matchLabels = (selector?.matchLabels as Record<string, string>) || labels;

    const template = specObj.template as Record<string, unknown> | undefined;
    const podSpec = template?.spec as Record<string, unknown> | undefined;
    const containers = this.parseContainers(podSpec?.containers as Array<Record<string, unknown>> || []);

    return {
      kind: 'Deployment',
      name,
      namespace,
      labels: matchLabels,
      spec: specObj,
      replicas,
      containers,
    };
  }

  private parseContainers(containersConfig: Array<Record<string, unknown>>): ContainerInfo[] {
    return containersConfig.map(container => {
      const ports = (container.ports as Array<Record<string, unknown>> || [])
        .map(p => p.containerPort as number)
        .filter(p => p !== undefined);

      const env = this.parseEnvVars(container.env as Array<Record<string, unknown>> || []);

      return {
        name: (container.name as string) || 'unknown',
        image: (container.image as string) || 'unknown',
        ports,
        env,
      };
    });
  }

  private parseEnvVars(envConfig: Array<Record<string, unknown>>): Record<string, string> {
    const env: Record<string, string> = {};
    for (const item of envConfig) {
      const name = item.name as string;
      const value = item.value as string;
      if (name && value !== undefined) {
        env[name] = value;
      }
    }
    return env;
  }

  private parseService(
    name: string,
    namespace: string,
    labels: Record<string, string>,
    spec: Record<string, unknown> | undefined
  ): KubernetesService {
    const specObj = spec || {};
    const serviceType = (specObj.type as string) || 'ClusterIP';

    const portsConfig = specObj.ports as Array<Record<string, unknown>> || [];
    const ports: ServicePort[] = portsConfig.map(p => ({
      name: (p.name as string) || 'default',
      port: (p.port as number) || 80,
      targetPort: (p.targetPort as number) || (p.port as number) || 80,
      protocol: (p.protocol as string) || 'TCP',
    }));

    return {
      kind: 'Service',
      name,
      namespace,
      labels,
      spec: specObj,
      serviceType,
      ports,
    };
  }

  private parseIngress(
    name: string,
    namespace: string,
    labels: Record<string, string>,
    spec: Record<string, unknown> | undefined
  ): KubernetesIngress {
    const specObj = spec || {};
    const rulesConfig = specObj.rules as Array<Record<string, unknown>> || [];

    const rules: IngressRule[] = rulesConfig.map(rule => {
      const host = (rule.host as string) || '';
      const http = rule.http as Record<string, unknown> | undefined;
      const pathsConfig = http?.paths as Array<Record<string, unknown>> || [];

      const paths: IngressPath[] = pathsConfig.map(p => {
        const backend = (p.backend || {}) as Record<string, unknown>;
        const service = backend.service as Record<string, unknown> | undefined;
        const port = service?.port as Record<string, unknown> | undefined;
        const serviceName = (service?.name as string) || (backend.serviceName as string) || '';
        const servicePort = (port?.number as number) || (backend.servicePort as number) || 80;

        return {
          path: (p.path as string) || '/',
          serviceName,
          servicePort,
        };
      });

      return { host, paths };
    });

    return {
      kind: 'Ingress',
      name,
      namespace,
      labels,
      spec: specObj,
      rules,
    };
  }

  private parseConfigMap(
    name: string,
    namespace: string,
    labels: Record<string, string>,
    data: Record<string, string> | undefined
  ): KubernetesConfigMap {
    return {
      kind: 'ConfigMap',
      name,
      namespace,
      labels,
      spec: {},
      data: data || {},
    };
  }

  private parseSecret(
    name: string,
    namespace: string,
    labels: Record<string, string>,
    doc: Record<string, unknown>
  ): KubernetesSecret {
    const type = (doc.type as string) || 'Opaque';
    const data = doc.data as Record<string, string> || {};
    const keys = Object.keys(data);

    return {
      kind: 'Secret',
      name,
      namespace,
      labels,
      spec: {},
      type,
      keys,
    };
  }

  private categorizeResources(resources: KubernetesResource[], analysis: KubernetesAnalysis): void {
    for (const resource of resources) {
      switch (resource.kind) {
        case 'Deployment':
          analysis.deployments.push(resource as KubernetesDeployment);
          break;
        case 'Service':
          analysis.services.push(resource as KubernetesService);
          break;
        case 'Ingress':
          analysis.ingresses.push(resource as KubernetesIngress);
          break;
        case 'ConfigMap':
          analysis.configMaps.push(resource as KubernetesConfigMap);
          break;
        case 'Secret':
          analysis.secrets.push(resource as KubernetesSecret);
          break;
      }
    }
  }

  private detectConnections(analysis: KubernetesAnalysis): KubernetesConnection[] {
    const connections: KubernetesConnection[] = [];

    for (const service of analysis.services) {
      const selector = service.labels;
      const matchingDeployment = analysis.deployments.find(d =>
        Object.entries(selector).every(([key, value]) => d.labels[key] === value)
      );
      if (matchingDeployment) {
        connections.push({
          from: service.name,
          to: matchingDeployment.name,
          type: 'service-to-deployment',
        });
      }
    }

    for (const ingress of analysis.ingresses) {
      for (const rule of ingress.rules) {
        for (const path of rule.paths) {
          const matchingService = analysis.services.find(s => s.name === path.serviceName);
          if (matchingService) {
            connections.push({
              from: ingress.name,
              to: matchingService.name,
              type: 'ingress-to-service',
            });
          }
        }
      }
    }

    return connections;
  }

  toGraphNodes(analysis: KubernetesAnalysis) {
    const nodes = [];

    for (const deployment of analysis.deployments) {
      nodes.push({
        id: `k8s-deployment-${deployment.name}`,
        type: 'service',
        name: deployment.name,
        metadata: {
          kind: 'Deployment',
          namespace: deployment.namespace,
          replicas: deployment.replicas,
          containers: deployment.containers.map(c => c.name),
        },
      });
    }

    for (const service of analysis.services) {
      nodes.push({
        id: `k8s-service-${service.name}`,
        type: 'gateway',
        name: service.name,
        metadata: {
          kind: 'Service',
          namespace: service.namespace,
          serviceType: service.serviceType,
          ports: service.ports.map(p => p.port),
        },
      });
    }

    for (const ingress of analysis.ingresses) {
      nodes.push({
        id: `k8s-ingress-${ingress.name}`,
        type: 'gateway',
        name: ingress.name,
        metadata: {
          kind: 'Ingress',
          namespace: ingress.namespace,
          rules: ingress.rules.map(r => r.host),
        },
      });
    }

    return nodes;
  }

  toGraphEdges(analysis: KubernetesAnalysis) {
    const edges = [];

    for (const conn of analysis.connections) {
      let sourceId: string;
      let targetId: string;

      if (conn.from.startsWith('k8s-')) {
        sourceId = conn.from;
      } else {
        const sourceDeployment = analysis.deployments.find(d => d.name === conn.from);
        const sourceService = analysis.services.find(s => s.name === conn.from);
        const sourceIngress = analysis.ingresses.find(i => i.name === conn.from);

        if (sourceDeployment) sourceId = `k8s-deployment-${conn.from}`;
        else if (sourceService) sourceId = `k8s-service-${conn.from}`;
        else if (sourceIngress) sourceId = `k8s-ingress-${conn.from}`;
        else continue;
      }

      if (conn.to.startsWith('k8s-')) {
        targetId = conn.to;
      } else {
        const targetDeployment = analysis.deployments.find(d => d.name === conn.to);
        const targetService = analysis.services.find(s => s.name === conn.to);

        if (targetDeployment) targetId = `k8s-deployment-${conn.to}`;
        else if (targetService) targetId = `k8s-service-${conn.to}`;
        else continue;
      }

      const edgeType = conn.type === 'ingress-to-service' ? 'routes' : 'network';

      edges.push({
        source: sourceId,
        target: targetId,
        type: edgeType,
      });
    }

    return edges;
  }
}
