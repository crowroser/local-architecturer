import { Handle, Position, type NodeProps } from '@xyflow/react';

interface CustomNodeData {
  label: string;
  type: string;
  version?: string;
  image?: string;
}

export default function CustomNode({ data, type }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const isPackage = type === 'package';
  
  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: `2px solid ${isPackage ? '#3b82f6' : '#10b981'}`,
        background: isPackage ? '#eff6ff' : '#ecfdf5',
        minWidth: '100px',
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
        {isPackage ? '📦' : '🐳'} {nodeData.label}
      </div>
      {nodeData.version && (
        <div style={{ fontSize: '10px', color: '#666' }}>v{nodeData.version}</div>
      )}
      {nodeData.image && (
        <div style={{ fontSize: '10px', color: '#666' }}>{nodeData.image}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
