import type { Node, Edge } from '@xyflow/react';

interface DetailPanelProps {
  node: Node | null;
  edges: Edge[];
  onClose: () => void;
}

export default function DetailPanel({ node, edges, onClose }: DetailPanelProps) {
  if (!node) return null;

  const connectedEdges = edges.filter(
    edge => edge.source === node.id || edge.target === node.id
  );

  const incomingEdges = connectedEdges.filter(edge => edge.target === node.id);
  const outgoingEdges = connectedEdges.filter(edge => edge.source === node.id);

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      width: '300px',
      maxHeight: 'calc(100vh - 20px)',
      overflowY: 'auto',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      zIndex: 20,
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>
          {node.type === 'package' ? '📦' : '🐳'} {node.data.label}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Details</h4>
          <div style={{ fontSize: '13px' }}>
            <div><strong>Type:</strong> {node.type}</div>
            {node.data.version && <div><strong>Version:</strong> {node.data.version}</div>}
            {node.data.path && <div><strong>Path:</strong> {node.data.path}</div>}
            {node.data.image && <div><strong>Image:</strong> {node.data.image}</div>}
            {node.data.ports && node.data.ports.length > 0 && (
              <div><strong>Ports:</strong> {node.data.ports.join(', ')}</div>
            )}
          </div>
        </div>

        {node.type === 'package' && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Dependencies</h4>
            <div style={{ fontSize: '13px' }}>
              {node.data.dependencies && node.data.dependencies.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {node.data.dependencies.map((dep: string) => (
                    <li key={dep}>{dep}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: '#999' }}>No dependencies</div>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Connections</h4>
          <div style={{ fontSize: '13px' }}>
            {incomingEdges.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <strong>Incoming ({incomingEdges.length}):</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  {incomingEdges.map(edge => (
                    <li key={edge.id}>{edge.source} ({edge.type})</li>
                  ))}
                </ul>
              </div>
            )}
            {outgoingEdges.length > 0 && (
              <div>
                <strong>Outgoing ({outgoingEdges.length}):</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  {outgoingEdges.map(edge => (
                    <li key={edge.id}>{edge.target} ({edge.type})</li>
                  ))}
                </ul>
              </div>
            )}
            {connectedEdges.length === 0 && (
              <div style={{ color: '#999' }}>No connections</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
