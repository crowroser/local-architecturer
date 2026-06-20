import type { DependencyGraph, DependencyEdge } from '../types/index.js';
import type { Pipeline } from '../types/cicd.js';

export class BuildEdgeGenerator {
  generate(pipelines: Pipeline[], graph: DependencyGraph): DependencyEdge[] {
    const edges: DependencyEdge[] = [];

    for (const pipeline of pipelines) {
      for (const job of pipeline.jobs) {
        const jobNodeId = `ci-${pipeline.platform}-${job.name}`;
        const jobExists = graph.nodes.some(n => n.id === jobNodeId);

        if (!jobExists) continue;

        for (const step of job.steps) {
          if (step.action) {
            const targetNode = this.findNodeByAction(step.action, graph);
            if (targetNode) {
              edges.push({
                source: jobNodeId,
                target: targetNode,
                type: 'builds',
              });
            }
          }
        }

        for (const need of job.needs) {
          const needNodeId = `ci-${pipeline.platform}-${need}`;
          if (graph.nodes.some(n => n.id === needNodeId)) {
            edges.push({
              source: jobNodeId,
              target: needNodeId,
              type: 'depends',
            });
          }
        }
      }
    }

    return edges;
  }

  private findNodeByAction(action: string, graph: DependencyGraph): string | null {
    const lower = action.toLowerCase();

    for (const node of graph.nodes) {
      if (node.type === 'package' && lower.includes(node.name.toLowerCase())) {
        return node.id;
      }
      if (node.type === 'service' && lower.includes(node.name.toLowerCase())) {
        return node.id;
      }
    }

    if (lower.includes('docker') || lower.includes('build')) {
      const serviceNode = graph.nodes.find(n => n.type === 'service');
      if (serviceNode) return serviceNode.id;
    }

    return null;
  }
}
