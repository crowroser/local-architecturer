import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomNodeData {
  label: string;
  type: string;
  version?: string;
  image?: string;
}

export default function CustomNode({ data, type }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const isPackage = type === 'package';
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: `2px solid ${isPackage ? '#3b82f6' : '#10b981'}`,
        background: isDark 
          ? (isPackage ? '#1e3a5f' : '#1a3d2e')
          : (isPackage ? '#eff6ff' : '#ecfdf5'),
        minWidth: '100px',
        textAlign: 'center',
        cursor: 'pointer',
        color: isDark ? '#fff' : '#000',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: isDark ? '#fff' : '#333' }} />
      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
        {isPackage ? '📦' : '🐳'} {nodeData.label}
      </div>
      {nodeData.version && (
        <div style={{ fontSize: '10px', color: isDark ? '#ccc' : '#666' }}>v{nodeData.version}</div>
      )}
      {nodeData.image && (
        <div style={{ fontSize: '10px', color: isDark ? '#ccc' : '#666' }}>{nodeData.image}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: isDark ? '#fff' : '#333' }} />
    </div>
  );
}
