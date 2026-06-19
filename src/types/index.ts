export interface ProjectStructure {
  rootDir: string;
  name: string;
  packages: PackageInfo[];
  dockerConfigs: DockerConfig[];
  dependencies: DependencyGraph;
}

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  dependencies: string[];
  devDependencies: string[];
}

export interface VolumeMapping {
  source: string;
  target: string;
  readOnly: boolean;
}

export interface DockerService {
  name: string;
  image?: string;
  build?: string;
  ports: string[];
  volumes: VolumeMapping[];
  dependsOn: string[];
  networks: string[];
  environment: Record<string, string>;
}

export interface DockerConfig {
  type: 'dockerfile' | 'docker-compose';
  path: string;
  services: string[];
  serviceDetails?: DockerService[];
  networks?: string[];
  dockerfile?: DockerfileInfo;
}

export interface DockerfileInfo {
  path: string;
  baseImage: string | null;
  exposedPorts: string[];
  buildArgs: string[];
  isMultiStage: boolean;
  stages: DockerfileStage[];
}

export interface DockerfileStage {
  from: string;
  as: string | null;
  commands: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  type: 'package' | 'service';
  name: string;
  metadata?: Record<string, unknown>;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'depends' | 'builds' | 'network';
}

export interface AnalyzeOptions {
  path: string;
  format: 'json' | 'text';
}
