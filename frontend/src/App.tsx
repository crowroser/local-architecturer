import { ReactFlowProvider } from '@xyflow/react';
import { ThemeProvider } from './contexts/ThemeContext';
import GraphView from './components/GraphView';
import '@xyflow/react/dist/style.css';

function App() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <div style={{ display: 'flex', height: '100vh' }}>
          <div style={{ flex: 1 }}>
            <GraphView />
          </div>
        </div>
      </ReactFlowProvider>
    </ThemeProvider>
  );
}

export default App;
