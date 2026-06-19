import type { DependencyGraph } from '../types/index.js';

export class MermaidBuilder {
  static buildFlowchart(graph: DependencyGraph): string {
    const lines: string[] = ['graph TD'];
    
    for (const node of graph.nodes) {
      const shape = node.type === 'package' ? '([{}])' : '[[{}]]';
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
    
    if (packageNodes.length > 0) {
      lines.push('  subgraph packages');
      for (const node of packageNodes) {
        const label = node.name.replace(/["']/g, '');
        lines.push(`    ${this.sanitizeId(node.id)}([${label}])`);
      }
      lines.push('  end');
    }
    
    if (serviceNodes.length > 0) {
      lines.push('  subgraph services');
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
