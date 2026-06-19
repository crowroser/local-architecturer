import { useState, useEffect } from 'react';

interface ProxyRoute {
  domain: string;
  port: string;
  targetService: string;
  network?: string;
  tls: boolean;
}

interface ProxyConfig {
  platform: string;
  routes: ProxyRoute[];
}

interface ProxyViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProxyView({ isOpen, onClose }: ProxyViewProps) {
  const [configs, setConfigs] = useState<ProxyConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
    }
  }, [isOpen]);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/proxy');
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to fetch proxy configs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const platformIcons: Record<string, string> = {
    traefik: '🚦',
    nginx: '🔄',
    caddy: '🔧',
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>🌐 Proxy Routing</h3>
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
          <div style={{ color: '#666', fontSize: '13px' }}>Loading proxy configs...</div>
        ) : configs.length === 0 ? (
          <div style={{ color: '#999', fontSize: '13px' }}>No proxy configurations found</div>
        ) : (
          configs.map((config, idx) => (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>{platformIcons[config.platform] || '🌐'}</span>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  {config.platform.charAt(0).toUpperCase() + config.platform.slice(1)}
                </div>
              </div>

              {config.routes.map((route, routeIdx) => (
                <div key={routeIdx} style={{
                  padding: '8px',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px' }}>{route.tls ? '🔒' : '🔓'}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{route.domain}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>:{route.port}</span>
                    <span>→</span>
                    <span style={{ fontWeight: 'bold' }}>{route.targetService}</span>
                  </div>
                  {route.network && (
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                      network: {route.network}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
