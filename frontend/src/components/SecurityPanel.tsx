import { useState, useEffect } from 'react';

interface SecurityBoundary {
  sourceService: string;
  targetService: string;
  volumeSource: string;
  volumeTarget: string;
  permission: 'ro' | 'rw';
  riskLevel: 'safe' | 'warning' | 'dangerous';
  reason?: string;
}

interface SecurityBoundaryResult {
  boundaries: SecurityBoundary[];
  summary: {
    totalVolumes: number;
    readOnly: number;
    readWrite: number;
    dangerous: number;
    warnings: number;
  };
}

interface SecurityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SecurityPanel({ isOpen, onClose }: SecurityPanelProps) {
  const [result, setResult] = useState<SecurityBoundaryResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchBoundaries();
    }
  }, [isOpen]);

  const fetchBoundaries = async () => {
    try {
      const response = await fetch('/api/security-boundaries');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to fetch security boundaries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const riskColors: Record<string, string> = {
    safe: '#10b981',
    warning: '#f59e0b',
    dangerous: '#ef4444',
  };

  const riskIcons: Record<string, string> = {
    safe: '✅',
    warning: '⚠️',
    dangerous: '🚨',
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>🛡️ Security Boundaries</h3>
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
          <div style={{ color: '#666', fontSize: '13px' }}>Analyzing security boundaries...</div>
        ) : !result || result.boundaries.length === 0 ? (
          <div style={{ color: '#999', fontSize: '13px' }}>No volume boundaries found</div>
        ) : (
          <>
            <div style={{
              padding: '12px',
              background: result.summary.dangerous > 0 ? '#fef2f2' : '#f0fdf4',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                Summary
              </div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <strong>Total Volumes:</strong> {result.summary.totalVolumes}
              </div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#10b981' }}>Read-only: {result.summary.readOnly}</span>
              </div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#f59e0b' }}>Read-write: {result.summary.readWrite}</span>
              </div>
              {result.summary.dangerous > 0 && (
                <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>
                  Dangerous: {result.summary.dangerous}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                Volume Boundaries
              </div>
              {result.boundaries.map((boundary, idx) => (
                <div key={idx} style={{
                  padding: '8px',
                  background: '#f9f9f9',
                  borderLeft: `3px solid ${riskColors[boundary.riskLevel]}`,
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span>{riskIcons[boundary.riskLevel]}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
                      {boundary.sourceService}
                    </span>
                    <span style={{ color: '#666' }}>→</span>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
                      {boundary.targetService}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    <div>{boundary.volumeSource} → {boundary.volumeTarget}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: '2px',
                        background: boundary.permission === 'ro' ? '#dcfce7' : '#fef3c7',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}>
                        {boundary.permission.toUpperCase()}
                      </span>
                      {boundary.reason && (
                        <span style={{ fontSize: '10px', color: '#999' }}>{boundary.reason}</span>
                      )}
                    </div>
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
