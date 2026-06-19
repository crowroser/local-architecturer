import type { DockerService } from '../types/index.js';
import { findModelByName, type AIModelInfo } from '../utils/ai-model-database.js';

export interface DetectedAIModel {
  serviceName: string;
  model: AIModelInfo;
  quantization: 'fp16' | 'q8' | 'q4';
  estimatedVram: number;
}

const QUANTIZATION_PATTERNS: Array<{ pattern: RegExp; level: 'fp16' | 'q8' | 'q4' }> = [
  { pattern: /q4[_-]k[_-]m|q4_k|q4km/i, level: 'q4' },
  { pattern: /q4_0|q40/i, level: 'q4' },
  { pattern: /q5[_-]k[_-]m|q5_k/i, level: 'q4' },
  { pattern: /q8[_-]0|q80/i, level: 'q8' },
  { pattern: /q8_k/i, level: 'q8' },
  { pattern: /gguf/i, level: 'q4' },
  { pattern: /awq/i, level: 'q4' },
  { pattern: /gptq/i, level: 'q4' },
  { pattern: /fp16|float16/i, level: 'fp16' },
  { pattern: /fp32|float32/i, level: 'fp16' },
];

export class AIModelParser {
  parseFromServices(services: DockerService[]): DetectedAIModel[] {
    const models: DetectedAIModel[] = [];

    for (const service of services) {
      const detected = this.detectModelFromService(service);
      if (detected) {
        models.push(detected);
      }
    }

    return models;
  }

  private detectModelFromService(service: DockerService): DetectedAIModel | null {
    const image = service.image || '';
    const env = service.environment;

    const modelName = this.extractModelName(image, env);
    if (!modelName) return null;

    const model = findModelByName(modelName);
    if (!model) return null;

    const quantization = this.detectQuantization(image, env);
    const estimatedVram = model.vram[quantization];

    return {
      serviceName: service.name,
      model,
      quantization,
      estimatedVram,
    };
  }

  private extractModelName(image: string, env: Record<string, string>): string | null {
    const envModel = env['MODEL_NAME'] || env['HUGGINGFACE_MODEL'] || env['MODEL'];
    if (envModel) return envModel;

    const imageParts = image.split('/');
    const lastPart = imageParts[imageParts.length - 1] || '';
    const tagParts = lastPart.split(':');
    const namePart = tagParts[0] || '';

    if (namePart) return namePart;

    return null;
  }

  private detectQuantization(image: string, env: Record<string, string>): 'fp16' | 'q8' | 'q4' {
    const combined = `${image} ${env['QUANTIZATION'] || ''} ${env['TYPE'] || ''}`;

    for (const { pattern, level } of QUANTIZATION_PATTERNS) {
      if (pattern.test(combined)) return level;
    }

    return 'fp16';
  }
}
