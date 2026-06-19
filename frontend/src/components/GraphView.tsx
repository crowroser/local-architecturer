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
import { useTheme } from '../contexts/ThemeContext';
import CustomNode from './NodeTypes';
import FilterPanel from './FilterPanel';
import DetailPanel from './DetailPanel';
import ThemeToggle from './ThemeToggle';

const nodeTypes = {
  package: CustomNode,
  service: CustomNode,
};

export default function GraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { theme } = useTheme();

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

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleFilterChange = useCallback((filteredNodes: Node[], filteredEdges: Edge[]) => {
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [setNodes, setEdges]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        fontSize: '18px',
        color: theme === 'dark' ? '#fff' : '#666',
        background: theme === 'dark' ? '#1a1a1a' : '#fff',
      }}>
        Loading graph...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <FilterPanel
        nodes={nodes}
        edges={edges}
        onFilterChange={handleFilterChange}
      />
      <DetailPanel
        node={selectedNode}
        edges={edges}
        onClose={() => setSelectedNode(null)}
      />
      <ThemeToggle />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ background: theme === 'dark' ? '#1a1a1a' : '#ffffff' }}
      >
        <Background color={theme === 'dark' ? '#333' : '#eee'} />
        <Controls style={{ background: theme === 'dark' ? '#333' : '#fff' }} />
        <MiniMap 
          style={{ background: theme === 'dark' ? '#2a2a2a' : '#f9f9f9' }}
          nodeColor={theme === 'dark' ? '#666' : '#ddd'}
        />
      </ReactFlow>
    </div>
  );
}
