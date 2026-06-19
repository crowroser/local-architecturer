import { useState, useEffect } from 'react';

interface AIWarning {
  serviceName: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  vramNeeded: number;
}

interface DetectedModel {
  serviceName: string;
  model: {
    name: string;
    family: string;
    parameters: number;
  };
  quantization: string;
  estimatedVram: number;
}

interface AIProfile {
  models: DetectedModel[];
  totalVram: number;
  warnings: AIWarning[];
  summary: {
    totalModels: number;
    totalVramGB: number;
    highestRequirement: string;
  };
}

interface ProfilerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilerPanel({ isOpen, onClose }: ProfilerPanelProps) {
  const [profile, setProfile] = useState<AIProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/ai-profile');
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch AI profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const severityColors: Record<string, string> = {
    critical: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      width: '320px',
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>🧠 AI Hardware Profiler</h3>
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
          <div style={{ color: '#666', fontSize: '13px' }}>Analyzing AI models...</div>
        ) : !profile || profile.models.length === 0 ? (
          <div style={{ color: '#999', fontSize: '13px' }}>No AI models detected in Docker services</div>
        ) : (
          <>
            <div style={{
              padding: '12px',
              background: '#f0f9ff',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                Summary
              </div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <strong>Models:</strong> {profile.summary.totalModels}
              </div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <strong>Total VRAM:</strong> {profile.summary.totalVramGB}GB
              </div>
              <div style={{ fontSize: '12px' }}>
                <strong>Highest:</strong> {profile.summary.highestRequirement}
              </div>
            </div>

            {profile.warnings.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#EF4444' }}>
                  ⚠️ Warnings
                </div>
                {profile.warnings.map((warning, idx) => (
                  <div key={idx} style={{
                    padding: '8px',
                    background: `${severityColors[warning.severity]}10`,
                    borderLeft: `3px solid ${severityColors[warning.severity]}`,
                    borderRadius: '4px',
                    marginBottom: '4px',
                    fontSize: '11px',
                  }}>
                    {warning.message}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                Detected Models
              </div>
              {profile.models.map((model, idx) => (
                <div key={idx} style={{
                  padding: '8px',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                    {model.serviceName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {model.model.name} ({model.model.parameters}B params)
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    Quantization: {model.quantization} | VRAM: {model.estimatedVram}GB
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
