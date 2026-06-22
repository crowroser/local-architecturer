import type { DependencyGraph, DependencyEdge } from '../types/index.js';

export interface CircularDependency {
  cycle: string[];
  edges: DependencyEdge[];
}

export class CircularDetector {
  static detect(graph: DependencyGraph): CircularDependency[] {
    const adjList = new Map<string, DependencyEdge[]>();
    const packageNodes = graph.nodes.filter(n => n.type === 'package');

    for (const node of packageNodes) {
      adjList.set(node.id, []);
    }

    for (const edge of graph.edges) {
      if (edge.type === 'depends' && adjList.has(edge.source)) {
        adjList.get(edge.source)!.push(edge);
      }
    }

    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const edges = adjList.get(node) || [];
      for (const edge of edges) {
        const neighbor = edge.target;
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor);
          const cycleEdges: DependencyEdge[] = [];
          for (let i = 0; i < cycle.length - 1; i++) {
            const found = graph.edges.find(
              e => e.source === cycle[i] && e.target === cycle[i + 1] && e.type === 'depends'
            );
            if (found) cycleEdges.push(found);
          }
          cycles.push({ cycle, edges: cycleEdges });
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of packageNodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  static hasCircularDependencies(graph: DependencyGraph): boolean {
    return this.detect(graph).length > 0;
  }

  static getAffectedPackages(graph: DependencyGraph): string[] {
    const cycles = this.detect(graph);
    const affected = new Set<string>();
    for (const cycle of cycles) {
      for (const pkg of cycle.cycle) {
        affected.add(pkg);
      }
    }
    return Array.from(affected);
  }
}
