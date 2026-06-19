import type { DockerService } from '../types/index.js';
import { AIModelParser, type DetectedAIModel } from '../parsers/ai-model-parser.js';

export interface AIProfileResult {
  models: DetectedAIModel[];
  totalVram: number;
  warnings: AIWarning[];
  summary: {
    totalModels: number;
    totalVramGB: number;
    highestRequirement: string;
  };
}

export interface AIWarning {
  serviceName: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  vramNeeded: number;
}

export class AIProfiler {
  private parser: AIModelParser;

  constructor() {
    this.parser = new AIModelParser();
  }

  profile(services: DockerService[]): AIProfileResult {
    const models = this.parser.parseFromServices(services);
    const totalVram = models.reduce((sum, m) => sum + m.estimatedVram, 0);
    const warnings = this.generateWarnings(models);

    const highestModel = models.reduce((max, m) =>
      m.estimatedVram > (max?.estimatedVram || 0) ? m : max, models[0]);

    return {
      models,
      totalVram,
      warnings,
      summary: {
        totalModels: models.length,
        totalVramGB: totalVram,
        highestRequirement: highestModel
          ? `${highestModel.model.name} (${highestModel.estimatedVram}GB)`
          : 'None',
      },
    };
  }

  private generateWarnings(models: DetectedAIModel[]): AIWarning[] {
    const warnings: AIWarning[] = [];

    for (const model of models) {
      if (model.estimatedVram >= 24) {
        warnings.push({
          serviceName: model.serviceName,
          severity: 'critical',
          message: `${model.model.name} requires ${model.estimatedVram}GB VRAM - High-end GPU needed`,
          vramNeeded: model.estimatedVram,
        });
      } else if (model.estimatedVram >= 16) {
        warnings.push({
          serviceName: model.serviceName,
          severity: 'high',
          message: `${model.model.name} requires ${model.estimatedVram}GB VRAM - Professional GPU recommended`,
          vramNeeded: model.estimatedVram,
        });
      } else if (model.estimatedVram >= 8) {
        warnings.push({
          serviceName: model.serviceName,
          severity: 'medium',
          message: `${model.model.name} requires ${model.estimatedVram}GB VRAM`,
          vramNeeded: model.estimatedVram,
        });
      }
    }

    const totalVram = models.reduce((sum, m) => sum + m.estimatedVram, 0);
    if (totalVram >= 48) {
      warnings.push({
        serviceName: 'total',
        severity: 'critical',
        message: `Total VRAM requirement (${totalVram}GB) exceeds single consumer GPU capacity`,
        vramNeeded: totalVram,
      });
    }

    return warnings;
  }
}
