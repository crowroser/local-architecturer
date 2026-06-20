import { Logger } from '../utils/logger.js';

export interface ReviewConfig {
  provider: 'ollama' | 'openrouter' | 'lmstudio';
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface ReviewResult {
  recommendations: ReviewRecommendation[];
  summary: string;
  score: number;
}

export interface ReviewRecommendation {
  category: 'security' | 'performance' | 'architecture' | 'reliability' | 'maintainability';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  affectedComponents: string[];
}

export class ReviewEngine {
  private config: ReviewConfig;
  private logger: Logger;

  constructor(config: ReviewConfig) {
    this.config = config;
    this.logger = new Logger('[ReviewEngine] ');
  }

  async review(projectData: Record<string, unknown>): Promise<ReviewResult> {
    const prompt = this.buildPrompt(projectData);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error) {
      this.logger.error(`LLM review failed: ${error}`);
      return {
        recommendations: [],
        summary: 'Failed to get review from LLM',
        score: 0,
      };
    }
  }

  private buildPrompt(projectData: Record<string, unknown>): string {
    const jsonStr = JSON.stringify(projectData, null, 2);
    
    return `You are an expert software architect reviewing a project's architecture. Analyze the following project structure and provide recommendations.

Project Structure:
${jsonStr}

Please provide:
1. Security issues and recommendations
2. Performance concerns
3. Architecture improvements
4. Reliability and scalability suggestions
5. Maintainability observations

For each recommendation, specify:
- Category (security/performance/architecture/reliability/maintainability)
- Severity (critical/warning/info)
- Message describing the issue
- Which components are affected

Provide a brief summary and an overall architecture score (0-100).

Format your response as JSON:
{
  "summary": "Brief summary of findings",
  "score": 85,
  "recommendations": [
    {
      "category": "security",
      "severity": "warning",
      "message": "Description of issue",
      "affectedComponents": ["component-name"]
    }
  ]
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'ollama':
        return this.callOllama(prompt);
      case 'openrouter':
        return this.callOpenRouter(prompt);
      case 'lmstudio':
        return this.callLMStudio(prompt);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  private async callOllama(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json() as { response: string };
    return data.response;
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://local-architecturer.dev',
        'X-Title': 'Local Architecturer',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are an expert software architect.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private async callLMStudio(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:1234';
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are an expert software architect.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private parseResponse(response: string): ReviewResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        summary: string;
        score: number;
        recommendations: Array<{
          category: string;
          severity: string;
          message: string;
          affectedComponents: string[];
        }>;
      };

      return {
        summary: parsed.summary || 'Review completed',
        score: parsed.score || 0,
        recommendations: parsed.recommendations.map(r => ({
          category: r.category as ReviewRecommendation['category'],
          severity: r.severity as ReviewRecommendation['severity'],
          message: r.message,
          affectedComponents: r.affectedComponents || [],
        })),
      };
    } catch (error) {
      this.logger.warn(`Failed to parse LLM response: ${error}`);
      return {
        summary: response.slice(0, 500),
        score: 0,
        recommendations: [],
      };
    }
  }
}
