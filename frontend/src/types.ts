export interface GraphResponse {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  name: string;
  rootDir: string;
  packageCount: number;
  dockerServiceCount: number;
}

export interface CircularDependencyResponse {
  hasCircularDependencies: boolean;
  totalCycles: number;
  affectedPackages: string[];
  cycles: CycleInfo[];
}

export interface CycleInfo {
  path: string[];
  edgeCount: number;
}

export interface DependencyNode {
  id: string;
  type: 'package' | 'service' | 'hardware' | 'database' | 'gateway';
  name: string;
  metadata?: Record<string, unknown>;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'depends' | 'builds' | 'network' | 'connects' | 'volume' | 'routes';
}

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  dependencies: string[];
  devDependencies: string[];
  type?: 'node' | 'php' | 'python';
  language?: string;
}
