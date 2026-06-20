import type { DataFlowConfig, DataFlowStep, DataFlowPath } from '../types/dataflow.js';

export class DataFlowAnalyzer {
  analyzeFlows(flows: DataFlowConfig[]): DataFlowPath[] {
    return flows.map(flow => this.analyzeFlow(flow));
  }

  private analyzeFlow(flow: DataFlowConfig): DataFlowPath {
    const steps = flow.steps.map(s => s.name);
    const estimatedLatency = this.calculateLatency(flow.steps);
    const bottleneck = this.findBottleneck(flow.steps);

    return {
      flowName: flow.name,
      steps,
      estimatedLatency,
      bottleneck,
    };
  }

  private calculateLatency(steps: DataFlowStep[]): number {
    return steps.reduce((total, step) => total + (step.latencyMs || 0), 0);
  }

  private findBottleneck(steps: DataFlowStep[]): string | undefined {
    if (steps.length === 0) return undefined;

    let maxLatency = 0;
    let bottleneck: string | undefined;

    for (const step of steps) {
      const latency = step.latencyMs || 0;
      if (latency > maxLatency) {
        maxLatency = latency;
        bottleneck = step.name;
      }
    }

    return bottleneck;
  }
}
