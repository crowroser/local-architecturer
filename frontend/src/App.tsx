import { ReactFlowProvider } from '@xyflow/react';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import GraphView from './components/GraphView';
import '@xyflow/react/dist/style.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ReactFlowProvider>
          <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1 }}>
              <GraphView />
            </div>
          </div>
        </ReactFlowProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
