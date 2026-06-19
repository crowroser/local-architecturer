import { useState, useEffect } from 'react';

interface GitSnapshot {
  commitHash: string;
  timestamp: string;
  message: string;
  author: string;
  packageCount: number;
  serviceCount: number;
}

interface TimelineSliderProps {
  onCommitSelect: (commitHash: string) => void;
}

export default function TimelineSlider({ onCommitSelect }: TimelineSliderProps) {
  const [history, setHistory] = useState<GitSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history?commits=100');
      const data = await response.json();
      setHistory(data);
      if (data.length > 0) {
        setCurrentIndex(0);
        onCommitSelect(data[0].commitHash);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    setCurrentIndex(index);
    if (history[index]) {
      onCommitSelect(history[index].commitHash);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        color: '#666',
      }}>
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const current = history[currentIndex];

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: '400px',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {current.commitHash} - {current.message}
        </span>
        <span style={{ fontSize: '10px', color: '#666' }}>
          {current.author} | {new Date(current.timestamp).toLocaleDateString()}
        </span>
      </div>
      
      <input
        type="range"
        min={0}
        max={history.length - 1}
        value={currentIndex}
        onChange={handleSliderChange}
        style={{ width: '100%', marginBottom: '8px' }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
        <span>📦 {current.packageCount} packages</span>
        <span>🐳 {current.serviceCount} services</span>
        <span>{currentIndex + 1} / {history.length}</span>
      </div>
    </div>
  );
}
