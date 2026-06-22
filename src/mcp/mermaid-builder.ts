import type { DependencyGraph } from '../types/index.js';

export class MermaidBuilder {
  static buildFlowchart(graph: DependencyGraph): string {
    const lines: string[] = ['graph TD'];
    
    for (const node of graph.nodes) {
      const shape = this.getNodeShape(node);
      const label = node.name.replace(/["']/g, '');
      lines.push(`  ${this.sanitizeId(node.id)}${shape.replace('{}', label)}`);
    }
    
    lines.push('');
    
    for (const edge of graph.edges) {
      const arrow = this.getEdgeArrow(edge.type);
      lines.push(`  ${this.sanitizeId(edge.source)} ${arrow} ${this.sanitizeId(edge.target)}`);
    }
    
    return lines.join('\n');
  }

  static buildSubgraphByType(graph: DependencyGraph): string {
    const lines: string[] = ['graph TD'];
    
    const packageNodes = graph.nodes.filter(n => n.type === 'package');
    const serviceNodes = graph.nodes.filter(n => n.type === 'service');
    
    const nodeGroups = new Map<string, typeof packageNodes>();
    for (const node of packageNodes) {
      const lang = (node.metadata?.language as string) || 'javascript';
      if (!nodeGroups.has(lang)) {
        nodeGroups.set(lang, []);
      }
      nodeGroups.get(lang)!.push(node);
    }
    
    for (const [lang, nodes] of nodeGroups) {
      lines.push(`  subgraph ${lang}_packages`);
      for (const node of nodes) {
        const label = node.name.replace(/["']/g, '');
        const shape = this.getNodeShape(node);
        lines.push(`    ${this.sanitizeId(node.id)}${shape.replace('{}', label)}`);
      }
      lines.push('  end');
    }
    
    if (serviceNodes.length > 0) {
      lines.push('  subgraph docker_services');
      for (const node of serviceNodes) {
        const label = node.name.replace(/["']/g, '');
        lines.push(`    ${this.sanitizeId(node.id)}[[${label}]]`);
      }
      lines.push('  end');
    }
    
    lines.push('');
    
    for (const edge of graph.edges) {
      const arrow = this.getEdgeArrow(edge.type);
      lines.push(`  ${this.sanitizeId(edge.source)} ${arrow} ${this.sanitizeId(edge.target)}`);
    }
    
    return lines.join('\n');
  }

  private static getNodeShape(node: { type: string; metadata?: Record<string, unknown> }): string {
    if (node.type === 'service') return '[[{}]]';
    
    const language = node.metadata?.language as string;
    switch (language) {
      case 'php': return '([{}}])';
      case 'python': return '>{{}}>';
      default: return '([{}])';
    }
  }

  private static getEdgeArrow(type: string): string {
    switch (type) {
      case 'depends': return '-->';
      case 'builds': return '-.->';
      case 'network': return '-.-';
      default: return '-->';
    }
  }

  private static sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}
