import { useState, useEffect } from 'react';

interface PipelineStep {
  name: string;
  action?: string;
  command?: string;
}

interface PipelineJob {
  name: string;
  steps: PipelineStep[];
  needs: string[];
  runsOn?: string;
}

interface Pipeline {
  platform: string;
  name: string;
  file: string;
  triggers: string[];
  jobs: PipelineJob[];
}

interface PipelineViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PipelineView({ isOpen, onClose }: PipelineViewProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPipelines();
    }
  }, [isOpen]);

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/pipelines');
      const data = await response.json();
      setPipelines(data);
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const platformIcons: Record<string, string> = {
    'github-actions': '⚡',
    'gitlab-ci': '🦊',
    'jenkins': '🔧',
    'circleci': '⭕',
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>🔄 CI/CD Pipelines</h3>
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
          <div style={{ color: '#666', fontSize: '13px' }}>Loading pipelines...</div>
        ) : pipelines.length === 0 ? (
          <div style={{ color: '#999', fontSize: '13px' }}>No CI/CD pipelines found</div>
        ) : (
          pipelines.map((pipeline, idx) => (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>{platformIcons[pipeline.platform] || '🔄'}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{pipeline.name}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{pipeline.file}</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                Triggers: {pipeline.triggers.join(', ')}
              </div>

              {pipeline.jobs.map((job, jobIdx) => (
                <div key={jobIdx} style={{
                  marginLeft: '12px',
                  padding: '8px',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                    {job.name}
                    {job.runsOn && (
                      <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                        ({job.runsOn})
                      </span>
                    )}
                  </div>
                  {job.needs.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
                      needs: {job.needs.join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {job.steps.length} steps
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
