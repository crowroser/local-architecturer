import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface DataFlowStep {
  name: string;
  type: string;
  service?: string;
  latencyMs?: number;
}

interface DataFlowConfig {
  name: string;
  description?: string;
  steps: DataFlowStep[];
  triggers: string[];
}

interface DataFlowViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataFlowView({ isOpen, onClose }: DataFlowViewProps) {
  const { colors } = useTheme();
  const [flows, setFlows] = useState<DataFlowConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchFlows();
    }
  }, [isOpen]);

  const fetchFlows = async () => {
    try {
      const response = await fetch('/api/dataflow');
      const data = await response.json();
      setFlows(data);
    } catch (error) {
      console.error('Failed to fetch data flows:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const stepTypeIcons: Record<string, string> = {
    input: '📥',
    process: '⚙️',
    transform: '🔄',
    cache: '💾',
    output: '📤',
    notify: '🔔',
  };

  const stepTypeColors: Record<string, string> = {
    input: colors.success,
    process: colors.primary,
    transform: '#8b5cf6',
    cache: colors.warning,
    output: colors.info,
    notify: colors.danger,
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      width: '320px',
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>🔀 Data Flow</h3>
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
        {loading ? (
          <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Loading data flows...</div>
        ) : flows.length === 0 ? (
          <div style={{ color: colors.textSecondary, fontSize: '13px' }}>No data flows detected</div>
        ) : (
          flows.map((flow, idx) => (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                {flow.name}
              </div>
              {flow.description && (
                <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '8px' }}>
                  {flow.description}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {flow.steps.map((step, stepIdx) => (
                  <div key={stepIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: stepTypeColors[step.type] || '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}>
                      {stepTypeIcons[step.type] || '⚙️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{step.name}</div>
                      <div style={{ fontSize: '10px', color: colors.textSecondary }}>
                        {step.type}
                        {step.service && ` • ${step.service}`}
                        {step.latencyMs && ` • ${step.latencyMs}ms`}
                      </div>
                    </div>
                    {stepIdx < flow.steps.length - 1 && (
                      <div style={{ fontSize: '12px', color: colors.border }}>→</div>
                    )}
                  </div>
                ))}
              </div>

              {flow.triggers.length > 0 && (
                <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: '8px' }}>
                  Triggers: {flow.triggers.join(', ')}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
