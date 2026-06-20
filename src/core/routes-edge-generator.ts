import type { DependencyGraph, DependencyEdge } from '../types/index.js';
import type { ProxyConfig } from '../types/proxy.js';

export class RoutesEdgeGenerator {
  generate(proxyConfigs: ProxyConfig[], graph: DependencyGraph): DependencyEdge[] {
    const edges: DependencyEdge[] = [];

    for (const config of proxyConfigs) {
      for (const route of config.routes) {
        const sourceNode = this.findGatewayNode(config.platform, graph);
        const targetNode = this.findServiceNode(route.targetService, graph);

        if (sourceNode && targetNode) {
          const edgeExists = edges.some(
            e => e.source === sourceNode && e.target === targetNode && e.type === 'routes'
          );

          if (!edgeExists) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'routes',
            });
          }
        }
      }
    }

    return edges;
  }

  private findGatewayNode(platform: string, graph: DependencyGraph): string | null {
    const gatewayNode = graph.nodes.find(
      n => n.type === 'gateway' && n.id.includes(platform)
    );
    return gatewayNode?.id || null;
  }

  private findServiceNode(serviceName: string, graph: DependencyGraph): string | null {
    const serviceNode = graph.nodes.find(
      n => n.type === 'service' && n.name === serviceName
    );
    return serviceNode?.id || null;
  }
}
