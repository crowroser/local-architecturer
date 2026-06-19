import { describe, it, expect } from 'vitest';
import { MermaidBuilder } from '../../src/mcp/mermaid-builder.js';
import type { DependencyGraph } from '../../src/types/index.js';

describe('MermaidBuilder', () => {
  it('should build flowchart from graph', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: '@app/core', type: 'package', name: '@app/core' },
        { id: '@app/ui', type: 'package', name: '@app/ui' },
      ],
      edges: [
        { source: '@app/ui', target: '@app/core', type: 'depends' },
      ],
    };

    const mermaid = MermaidBuilder.buildFlowchart(graph);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('_app_core');
    expect(mermaid).toContain('_app_ui');
    expect(mermaid).toContain('-->');
  });

  it('should build subgraph by type', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: '@app/core', type: 'package', name: '@app/core' },
        { id: 'web', type: 'service', name: 'web' },
        { id: 'api', type: 'service', name: 'api' },
      ],
      edges: [
        { source: '@app/ui', target: '@app/core', type: 'depends' },
        { source: 'web', target: 'api', type: 'network' },
      ],
    };

    const mermaid = MermaidBuilder.buildSubgraphByType(graph);
    expect(mermaid).toContain('subgraph packages');
    expect(mermaid).toContain('subgraph services');
    expect(mermaid).toContain('_app_core');
    expect(mermaid).toContain('web');
    expect(mermaid).toContain('api');
  });

  it('should use correct arrow types', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'package', name: 'b' },
        { id: 'c', type: 'service', name: 'c' },
        { id: 'd', type: 'service', name: 'd' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'depends' },
        { source: 'c', target: 'd', type: 'network' },
      ],
    };

    const mermaid = MermaidBuilder.buildFlowchart(graph);
    expect(mermaid).toContain('a --> b');
    expect(mermaid).toContain('c -.- d');
  });

  it('should sanitize node IDs', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: '@scope/package-name', type: 'package', name: '@scope/package-name' },
      ],
      edges: [],
    };

    const mermaid = MermaidBuilder.buildFlowchart(graph);
    expect(mermaid).toContain('_scope_package_name');
  });
});
