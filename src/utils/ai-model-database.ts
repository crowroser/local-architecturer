export interface AIModelInfo {
  name: string;
  family: string;
  parameters: number;
  vram: {
    fp16: number;
    q8: number;
    q4: number;
  };
}

const AI_MODEL_DATABASE: AIModelInfo[] = [
  {
    name: 'llama-2-7b',
    family: 'llama',
    parameters: 7,
    vram: { fp16: 16, q8: 8, q4: 4.5 },
  },
  {
    name: 'llama-2-13b',
    family: 'llama',
    parameters: 13,
    vram: { fp16: 28, q8: 14, q4: 8 },
  },
  {
    name: 'llama-2-70b',
    family: 'llama',
    parameters: 70,
    vram: { fp16: 140, q8: 72, q4: 40 },
  },
  {
    name: 'llama-3-8b',
    family: 'llama',
    parameters: 8,
    vram: { fp16: 18, q8: 9, q4: 5 },
  },
  {
    name: 'llama-3-70b',
    family: 'llama',
    parameters: 70,
    vram: { fp16: 140, q8: 72, q4: 40 },
  },
  {
    name: 'llama-3-405b',
    family: 'llama',
    parameters: 405,
    vram: { fp16: 810, q8: 410, q4: 230 },
  },
  {
    name: 'qwen-2-0.5b',
    family: 'qwen',
    parameters: 0.5,
    vram: { fp16: 1.5, q8: 0.8, q4: 0.5 },
  },
  {
    name: 'qwen-2-1.5b',
    family: 'qwen',
    parameters: 1.5,
    vram: { fp16: 3.5, q8: 2, q4: 1.2 },
  },
  {
    name: 'qwen-2-7b',
    family: 'qwen',
    parameters: 7,
    vram: { fp16: 16, q8: 8, q4: 4.5 },
  },
  {
    name: 'qwen-2-14b',
    family: 'qwen',
    parameters: 14,
    vram: { fp16: 30, q8: 15, q4: 9 },
  },
  {
    name: 'qwen-2-32b',
    family: 'qwen',
    parameters: 32,
    vram: { fp16: 66, q8: 34, q4: 19 },
  },
  {
    name: 'qwen-2-72b',
    family: 'qwen',
    parameters: 72,
    vram: { fp16: 144, q8: 74, q4: 42 },
  },
  {
    name: 'deepseek-7b',
    family: 'deepseek',
    parameters: 7,
    vram: { fp16: 16, q8: 8, q4: 4.5 },
  },
  {
    name: 'deepseek-67b',
    family: 'deepseek',
    parameters: 67,
    vram: { fp16: 134, q8: 68, q4: 38 },
  },
  {
    name: 'mistral-7b',
    family: 'mistral',
    parameters: 7,
    vram: { fp16: 16, q8: 8, q4: 4.5 },
  },
  {
    name: 'mixtral-8x7b',
    family: 'mistral',
    parameters: 47,
    vram: { fp16: 96, q8: 50, q4: 28 },
  },
  {
    name: 'phi-2',
    family: 'phi',
    parameters: 2.7,
    vram: { fp16: 6, q8: 3.2, q4: 2 },
  },
  {
    name: 'phi-3-mini',
    family: 'phi',
    parameters: 3.8,
    vram: { fp16: 8.5, q8: 4.5, q4: 2.8 },
  },
  {
    name: 'gemma-2b',
    family: 'gemma',
    parameters: 2,
    vram: { fp16: 5, q8: 2.5, q4: 1.5 },
  },
  {
    name: 'gemma-7b',
    family: 'gemma',
    parameters: 7,
    vram: { fp16: 16, q8: 8, q4: 4.5 },
  },
];

export function findModelByName(name: string): AIModelInfo | undefined {
  const lower = name.toLowerCase();
  return AI_MODEL_DATABASE.find(m =>
    lower.includes(m.name) || lower.includes(m.family)
  );
}

export function estimateVramFromParams(paramsBillion: number): number {
  return Math.ceil(paramsBillion * 2 * 1.2);
}
