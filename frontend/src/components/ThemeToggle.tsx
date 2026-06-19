import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 30,
        background: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#333',
        border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
        borderRadius: '8px',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
