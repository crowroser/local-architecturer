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
import TimelineSlider from './TimelineSlider';
import PipelineView from './PipelineView';
import ProfilerPanel from './ProfilerPanel';
import DatabasePanel from './DatabasePanel';
import ProxyView from './ProxyView';
import DataFlowView from './DataFlowView';
import SecurityPanel from './SecurityPanel';

const nodeTypes = {
  package: CustomNode,
  service: CustomNode,
  hardware: CustomNode,
  database: CustomNode,
  gateway: CustomNode,
};

export default function GraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showPipelines, setShowPipelines] = useState(false);
  const [showProfiler, setShowProfiler] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);
  const [showProxy, setShowProxy] = useState(false);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const [graphResponse, circularResponse] = await Promise.all([
        fetch('/api/graph'),
        fetch('/api/circular'),
      ]);
      const data = await graphResponse.json();
      const circularData = await circularResponse.json();
      
      const layoutedNodes = applyLayout(data.nodes, data.edges);
      
      const circularEdgeSet = new Set<string>();
      if (circularData.hasCircularDependencies) {
        for (const cycle of circularData.cycles) {
          for (let i = 0; i < cycle.path.length - 1; i++) {
            circularEdgeSet.add(`${cycle.path[i]}->${cycle.path[i + 1]}`);
          }
        }
      }

      const flowNodes: Node[] = layoutedNodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: { label: node.name, ...node },
      }));

      const flowEdges: Edge[] = data.edges.map((edge: any, index: number) => {
        const isCircular = circularEdgeSet.has(`${edge.source}->${edge.target}`);
        const isHardware = edge.type === 'connects';
        const isVolume = edge.type === 'volume';
        const isGateway = edge.type === 'routes';
        return {
          id: `e-${index}`,
          source: edge.source,
          target: edge.target,
          type: edge.type === 'network' ? 'step' : 'smoothstep',
          animated: edge.type === 'network' || isCircular || isHardware || isVolume,
          style: {
            stroke: isCircular
              ? '#ef4444'
              : isHardware
                ? '#F59E0B'
                : isVolume
                  ? '#6366f1'
                  : isGateway
                    ? '#f97316'
                    : edge.type === 'depends'
                      ? '#3b82f6'
                      : '#10b981',
            strokeWidth: isCircular ? 3 : 2,
          },
          label: isCircular ? '⚠️' : isHardware ? '⚡' : isVolume ? '📁' : isGateway ? '🌐' : undefined,
        };
      });

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

  const handleCommitSelect = useCallback(async (commitHash: string) => {
    try {
      const response = await fetch(`/api/history/${commitHash}`);
      const snapshot = await response.json();
      if (snapshot && snapshot.packages) {
        const newNodes: Node[] = snapshot.packages.map((pkg: any, idx: number) => ({
          id: pkg.name || `pkg-${idx}`,
          type: 'package',
          position: { x: 100 + (idx % 5) * 200, y: 100 + Math.floor(idx / 5) * 100 },
          data: { label: pkg.name, ...pkg },
        }));
        setNodes(newNodes);
        setEdges([]);
      }
    } catch (error) {
      console.error('Failed to fetch commit snapshot:', error);
    }
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
      
      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 10,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '80%',
      }}>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showTimeline ? '#3b82f6' : 'white',
            color: showTimeline ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ⏱️ Timeline
        </button>
        <button
          onClick={() => setShowPipelines(!showPipelines)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showPipelines ? '#3b82f6' : 'white',
            color: showPipelines ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🔄 Pipelines
        </button>
        <button
          onClick={() => setShowProfiler(!showProfiler)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showProfiler ? '#3b82f6' : 'white',
            color: showProfiler ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🧠 AI Profiler
        </button>
        <button
          onClick={() => setShowDatabase(!showDatabase)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showDatabase ? '#6366f1' : 'white',
            color: showDatabase ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🗄️ Database
        </button>
        <button
          onClick={() => setShowProxy(!showProxy)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showProxy ? '#f97316' : 'white',
            color: showProxy ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🌐 Proxy
        </button>
        <button
          onClick={() => setShowDataFlow(!showDataFlow)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showDataFlow ? '#8b5cf6' : 'white',
            color: showDataFlow ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🔀 DataFlow
        </button>
        <button
          onClick={() => setShowSecurity(!showSecurity)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: showSecurity ? '#ef4444' : 'white',
            color: showSecurity ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🛡️ Security
        </button>
      </div>

      {showTimeline && (
        <TimelineSlider onCommitSelect={handleCommitSelect} />
      )}
      <PipelineView isOpen={showPipelines} onClose={() => setShowPipelines(false)} />
      <ProfilerPanel isOpen={showProfiler} onClose={() => setShowProfiler(false)} />
      <DatabasePanel isOpen={showDatabase} onClose={() => setShowDatabase(false)} />
      <ProxyView isOpen={showProxy} onClose={() => setShowProxy(false)} />
      <DataFlowView isOpen={showDataFlow} onClose={() => setShowDataFlow(false)} />
      <SecurityPanel isOpen={showSecurity} onClose={() => setShowSecurity(false)} />
      
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
