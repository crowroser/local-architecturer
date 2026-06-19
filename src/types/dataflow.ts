export interface DataFlowConfig {
  name: string;
  description?: string;
  steps: DataFlowStep[];
  triggers: string[];
}

export interface DataFlowStep {
  name: string;
  type: 'input' | 'process' | 'transform' | 'cache' | 'output' | 'notify';
  service?: string;
  description?: string;
  latencyMs?: number;
  inputFormat?: string;
  outputFormat?: string;
}

export interface DataFlowPath {
  flowName: string;
  steps: string[];
  estimatedLatency: number;
  bottleneck?: string;
}
