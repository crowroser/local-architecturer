import dagre from 'dagre';

interface GraphNode {
  id: string;
  type: string;
  name: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export function applyLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 150, height: 60 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      x: nodeWithPosition.x - 75,
      y: nodeWithPosition.y - 30,
    };
  });
}
