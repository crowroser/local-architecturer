import { useState, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface FilterPanelProps {
  nodes: Node[];
  edges: Edge[];
  onFilterChange: (filteredNodes: Node[], filteredEdges: Edge[]) => void;
}

export default function FilterPanel({ nodes, edges, onFilterChange }: FilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPackages, setShowPackages] = useState(true);
  const [showServices, setShowServices] = useState(true);

  const filteredData = useMemo(() => {
    let filteredNodes = nodes.filter(node => {
      const matchesType = 
        (node.type === 'package' && showPackages) ||
        (node.type === 'service' && showServices);
      
      const matchesSearch = searchTerm === '' || 
        node.data.label?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesType && matchesSearch;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );

    return { filteredNodes, filteredEdges };
  }, [nodes, edges, searchTerm, showPackages, showServices]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onFilterChange(filteredData.filteredNodes, filteredData.filteredEdges);
  };

  const handleTypeChange = (type: 'packages' | 'services', checked: boolean) => {
    if (type === 'packages') {
      setShowPackages(checked);
    } else {
      setShowServices(checked);
    }
    onFilterChange(filteredData.filteredNodes, filteredData.filteredEdges);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 10,
      background: 'white',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '200px',
    }}>
      <input
        type="text"
        placeholder="Search nodes..."
        value={searchTerm}
        onChange={handleSearchChange}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showPackages}
            onChange={(e) => handleTypeChange('packages', e.target.checked)}
          />
          <span>📦 Packages</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showServices}
            onChange={(e) => handleTypeChange('services', e.target.checked)}
          />
          <span>🐳 Services</span>
        </label>
      </div>
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        Showing {filteredData.filteredNodes.length} of {nodes.length} nodes
      </div>
    </div>
  );
}
