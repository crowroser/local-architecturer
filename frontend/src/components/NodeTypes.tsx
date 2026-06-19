import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomNodeData {
  label: string;
  type: string;
  version?: string;
  image?: string;
  language?: string;
  deviceType?: string;
  path?: string;
  isVolume?: boolean;
  tableCount?: number;
  domain?: string;
}

const languageIcons: Record<string, string> = {
  javascript: '📦',
  php: '🐘',
  python: '🐍',
};

const languageColors: Record<string, string> = {
  javascript: '#3b82f6',
  php: '#8B5CF6',
  python: '#10B981',
};

const hardwareIcons: Record<string, string> = {
  serial: '🔌',
  usb: '⚡',
  gpio: '🔧',
};

const hardwareColors: Record<string, string> = {
  serial: '#F59E0B',
  usb: '#EF4444',
  gpio: '#8B5CF6',
};

export default function CustomNode({ data, type }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  const isHardware = type === 'hardware';
  const isPackage = type === 'package';
  const isDatabase = type === 'database';
  const isGateway = type === 'gateway';
  
  let icon: string;
  let accentColor: string;
  let bgColor: string;
  
  if (isHardware) {
    const deviceType = nodeData.deviceType || 'serial';
    icon = hardwareIcons[deviceType] || '🔌';
    accentColor = hardwareColors[deviceType] || '#F59E0B';
    bgColor = isDark ? '#4a3000' : '#fef3c7';
  } else if (isDatabase) {
    icon = nodeData.isVolume ? '📁' : '🗄️';
    accentColor = '#6366f1';
    bgColor = isDark ? '#312e81' : '#eef2ff';
  } else if (isGateway) {
    icon = '🌐';
    accentColor = '#f97316';
    bgColor = isDark ? '#7c2d12' : '#fff7ed';
  } else {
    const language = nodeData.language || 'javascript';
    icon = languageIcons[language] || (isPackage ? '📦' : '🐳');
    accentColor = isPackage
      ? (languageColors[language] || '#3b82f6')
      : '#10b981';
    bgColor = isDark
      ? (isPackage ? '#1e3a5f' : '#1a3d2e')
      : (isPackage ? '#eff6ff' : '#ecfdf5');
  }
  
  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: `2px solid ${accentColor}`,
        background: bgColor,
        minWidth: '100px',
        textAlign: 'center',
        cursor: 'pointer',
        color: isDark ? '#fff' : '#000',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: isDark ? '#fff' : '#333' }} />
      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
        {icon} {nodeData.label}
      </div>
      {nodeData.version && (
        <div style={{ fontSize: '10px', color: isDark ? '#ccc' : '#666' }}>v{nodeData.version}</div>
      )}
      {nodeData.image && (
        <div style={{ fontSize: '10px', color: isDark ? '#ccc' : '#666' }}>{nodeData.image}</div>
      )}
      {isHardware && nodeData.path && (
        <div style={{ fontSize: '9px', color: accentColor, marginTop: '2px', fontWeight: 'bold' }}>
          {nodeData.path}
        </div>
      )}
      {isDatabase && nodeData.tableCount && nodeData.tableCount > 0 && (
        <div style={{ fontSize: '9px', color: accentColor, marginTop: '2px', fontWeight: 'bold' }}>
          {nodeData.tableCount} tables
        </div>
      )}
      {isGateway && nodeData.domain && (
        <div style={{ fontSize: '9px', color: accentColor, marginTop: '2px', fontWeight: 'bold' }}>
          {nodeData.domain}
        </div>
      )}
      {!isHardware && !isDatabase && !isGateway && nodeData.language && nodeData.language !== 'javascript' && (
        <div style={{ 
          fontSize: '9px', 
          color: accentColor,
          marginTop: '2px',
          fontWeight: 'bold',
        }}>
          {nodeData.language.toUpperCase()}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: isDark ? '#fff' : '#333' }} />
    </div>
  );
}
