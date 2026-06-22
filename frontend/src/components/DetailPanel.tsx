import type { Node, Edge } from '@xyflow/react';
import { useTheme } from '../contexts/ThemeContext';

interface NodeData {
  label: string;
  version?: string;
  path?: string;
  image?: string;
  ports?: string[];
  dependencies?: string[];
  deviceType?: string;
}

interface DetailPanelProps {
  node: Node | null;
  edges: Edge[];
  onClose: () => void;
}

export default function DetailPanel({ node, edges, onClose }: DetailPanelProps) {
  const { colors } = useTheme();
  if (!node) return null;

  const data = node.data as unknown as NodeData;
  const connectedEdges = edges.filter(
    edge => edge.source === node.id || edge.target === node.id
  );

  const incomingEdges = connectedEdges.filter(edge => edge.target === node.id);
  const outgoingEdges = connectedEdges.filter(edge => edge.source === node.id);

  const getNodeIcon = () => {
    if (node.type === 'hardware') {
      const deviceType = data.deviceType || 'serial';
      const icons: Record<string, string> = { serial: '🔌', usb: '⚡', gpio: '🔧' };
      return icons[deviceType] || '🔌';
    }
    return node.type === 'package' ? '📦' : '🐳';
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      width: '300px',
      maxHeight: 'calc(100vh - 20px)',
      overflowY: 'auto',
      background: colors.surface,
      borderRadius: '8px',
      boxShadow: `0 2px 8px ${colors.shadow}`,
      zIndex: 20,
    }}>
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>
          {getNodeIcon()} {data.label}
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
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.textSecondary }}>Details</h4>
          <div style={{ fontSize: '13px' }}>
            <div><strong>Type:</strong> {node.type}</div>
            {data.version && <div><strong>Version:</strong> {data.version}</div>}
            {data.path && <div><strong>Path:</strong> {data.path}</div>}
            {data.image && <div><strong>Image:</strong> {data.image}</div>}
            {node.type === 'hardware' && data.path && (
              <div><strong>Device:</strong> {data.path}</div>
            )}
            {node.type === 'hardware' && data.deviceType && (
              <div><strong>Protocol:</strong> {data.deviceType}</div>
            )}
            {data.ports && data.ports.length > 0 && (
              <div><strong>Ports:</strong> {data.ports.join(', ')}</div>
            )}
          </div>
        </div>

        {node.type === 'package' && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.textSecondary }}>Dependencies</h4>
            <div style={{ fontSize: '13px' }}>
              {data.dependencies && data.dependencies.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {data.dependencies.map((dep: string) => (
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
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.textSecondary }}>Connections</h4>
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
