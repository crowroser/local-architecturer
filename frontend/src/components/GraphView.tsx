import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import { applyLayout } from '../utils/layout';
import CustomNode from './NodeTypes';

const nodeTypes = {
  package: CustomNode,
  service: CustomNode,
};

export default function GraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const response = await fetch('/api/graph');
      const data = await response.json();
      
      const layoutedNodes = applyLayout(data.nodes, data.edges);
      
      const flowNodes: Node[] = layoutedNodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: { label: node.name, ...node },
      }));

      const flowEdges: Edge[] = data.edges.map((edge: any, index: number) => ({
        id: `e-${index}`,
        source: edge.source,
        target: edge.target,
        type: edge.type === 'network' ? 'step' : 'smoothstep',
        animated: edge.type === 'network',
        style: { stroke: edge.type === 'depends' ? '#3b82f6' : '#10b981' },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading graph...
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
