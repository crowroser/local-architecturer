import yaml from 'js-yaml';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DockerService } from '../types/index.js';
import type { DataFlowConfig, DataFlowStep } from '../types/dataflow.js';

const SERVICE_TYPE_PATTERNS: Array<{ pattern: RegExp; type: DataFlowStep['type'] }> = [
  { pattern: /ocr|vision|image|photo|picture/i, type: 'process' },
  { pattern: /audio|voice|speech|rvc|tts|stt/i, type: 'process' },
  { pattern: /redis|cache|memcache/i, type: 'cache' },
  { pattern: /api|gateway|proxy|ingress/i, type: 'input' },
  { pattern: /worker|processor|consumer|handler/i, type: 'transform' },
  { pattern: /notify|webhook|alert|slack/i, type: 'notify' },
  { pattern: /output|export|storage|s3|minio/i, type: 'output' },
  { pattern: /queue|rabbit|kafka|nats/i, type: 'transform' },
  { pattern: /ml|model|ai|llm|inference/i, type: 'process' },
];

export class DataFlowParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[DataFlowParser] ');
  }

  async parseAll(services: DockerService[]): Promise<DataFlowConfig[]> {
    const configs: DataFlowConfig[] = [];

    const userConfig = await this.parseUserConfig();
    if (userConfig) configs.push(userConfig);

    const autoDetected = this.detectFromServices(services);
    if (autoDetected) configs.push(autoDetected);

    return configs;
  }

  private async parseUserConfig(): Promise<DataFlowConfig | null> {
    const configFiles = ['dataflow.yaml', 'dataflow.yml', '.dataflow.yaml'];

    for (const file of configFiles) {
      if (!this.resolver.fileExistsSync(file)) continue;

      try {
        const content = this.resolver.readFileSync(file);
        const config = yaml.load(content) as Record<string, unknown>;

        if (!config || typeof config !== 'object') continue;

        const steps: DataFlowStep[] = (config.steps as Array<Record<string, unknown>> || []).map(s => ({
          name: s.name as string,
          type: (s.type as DataFlowStep['type']) || 'process',
          service: s.service as string | undefined,
          description: s.description as string | undefined,
          latencyMs: s.latencyMs as number | undefined,
          inputFormat: s.inputFormat as string | undefined,
          outputFormat: s.outputFormat as string | undefined,
        }));

        return {
          name: (config.name as string) || 'custom-flow',
          description: config.description as string | undefined,
          steps,
          triggers: (config.triggers as string[]) || [],
        };
      } catch (error) {
        this.logger.warn(`Failed to parse ${file}: ${error}`);
      }
    }

    return null;
  }

  private detectFromServices(services: DockerService[]): DataFlowConfig | null {
    if (services.length === 0) return null;

    const steps: DataFlowStep[] = services.map(service => ({
      name: service.name,
      type: this.detectServiceType(service),
      service: service.name,
      latencyMs: this.estimateLatency(service),
    }));

    const inputServices = steps.filter(s => s.type === 'input');
    const outputServices = steps.filter(s => s.type === 'output');
    const cacheServices = steps.filter(s => s.type === 'cache');
    const processServices = steps.filter(s => s.type === 'process' || s.type === 'transform');

    const orderedSteps: DataFlowStep[] = [
      ...inputServices,
      ...processServices,
      ...cacheServices,
      ...outputServices,
      ...steps.filter(s => !['input', 'process', 'transform', 'cache', 'output'].includes(s.type)),
    ];

    return {
      name: 'auto-detected-flow',
      description: 'Automatically detected from Docker services',
      steps: orderedSteps,
      triggers: ['docker-compose'],
    };
  }

  private detectServiceType(service: DockerService): DataFlowStep['type'] {
    const combined = `${service.name} ${service.image || ''}`;

    for (const { pattern, type } of SERVICE_TYPE_PATTERNS) {
      if (pattern.test(combined)) return type;
    }

    if (service.ports.length > 0) return 'input';
    if (service.dependsOn.length > 0) return 'transform';

    return 'process';
  }

  private estimateLatency(service: DockerService): number {
    let latency = 10;

    if (service.image?.includes('gpu') || service.image?.includes('cuda')) {
      latency += 100;
    }

    if (service.image?.includes('redis') || service.image?.includes('cache')) {
      latency = 5;
    }

    if (service.volumes.some(v => v.source.includes('data') || v.source.includes('storage'))) {
      latency += 50;
    }

    return latency;
  }
}
