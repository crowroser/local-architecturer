import { ReactFlowProvider } from '@xyflow/react';
import GraphView from './components/GraphView';
import '@xyflow/react/dist/style.css';

function App() {
  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{ flex: 1 }}>
          <GraphView />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;
