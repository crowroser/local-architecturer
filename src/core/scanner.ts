import { PathResolver } from './path-resolver.js';
import { DockerScanner } from './docker-scanner.js';
import { WorkspaceParser } from '../parsers/workspace-parser.js';
import { PackageParser } from '../parsers/package-parser.js';
import { DependencyParser } from '../parsers/dependency-parser.js';
import type { ProjectStructure, DependencyGraph, DependencyNode, DependencyEdge, PackageInfo } from '../types/index.js';

export class Scanner {
  private resolver: PathResolver;
  private dockerScanner: DockerScanner;
  private workspaceParser: WorkspaceParser;
  private packageParser: PackageParser;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.dockerScanner = new DockerScanner(resolver);
    this.workspaceParser = new WorkspaceParser(resolver);
    this.packageParser = new PackageParser(resolver);
  }

  async scan(): Promise<ProjectStructure> {
    const parsedPackages = this.scanPackages();
    const dockerConfigs = await this.dockerScanner.scan();
    const dependencies = this.buildDependencyGraph(parsedPackages, dockerConfigs);

    const packages: PackageInfo[] = parsedPackages.map(p => ({
      name: p.name,
      version: p.version,
      path: p.path,
      dependencies: Object.keys(p.dependencies),
      devDependencies: Object.keys(p.devDependencies),
    }));

    return {
      rootDir: this.resolver.getRootDir(),
      name: this.getProjectName(),
      packages,
      dockerConfigs,
      dependencies,
    };
  }

  private getProjectName(): string {
    try {
      const pkg = this.packageParser.parse('package.json');
      return pkg?.name || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private scanPackages() {
    const workspaceConfig = this.workspaceParser.parse();
    const packages = [];

    if (workspaceConfig && workspaceConfig.packages.length > 0) {
      for (const pattern of workspaceConfig.packages) {
        const files = this.resolver.findFilesSync(`${pattern}/package.json`);
        for (const file of files) {
          const relativePath = this.resolver.getRelativePath(file);
          const pkg = this.packageParser.parse(relativePath);
          if (pkg) packages.push(pkg);
        }
      }
    } else {
      const pkg = this.packageParser.parse('package.json');
      if (pkg) packages.push(pkg);
    }

    return packages;
  }

  private buildDependencyGraph(
    packages: Awaited<ReturnType<typeof this.scanPackages>>,
    dockerConfigs: ProjectStructure['dockerConfigs']
  ): DependencyGraph {
    const packageNames = packages.map(p => p.name);
    const dependencyParser = new DependencyParser(packageNames);

    const nodes: DependencyNode[] = packages.map(p => this.packageParser.toNode(p));
    const edges: DependencyEdge[] = packages.flatMap(p => dependencyParser.parseDependencies(p));

    for (const config of dockerConfigs) {
      if (config.serviceDetails) {
        for (const service of config.serviceDetails) {
          nodes.push({
            id: service.name,
            type: 'service',
            name: service.name,
            metadata: {
              image: service.image,
              ports: service.ports,
              volumes: service.volumes,
            },
          });

          for (const dep of service.dependsOn) {
            edges.push({
              source: service.name,
              target: dep,
              type: 'depends',
            });
          }

          for (const network of service.networks) {
            const networkServices = config.serviceDetails
              .filter(s => s.networks.includes(network) && s.name !== service.name);

            for (const networkService of networkServices) {
              const edgeExists = edges.some(
                e => e.source === service.name &&
                     e.target === networkService.name &&
                     e.type === 'network'
              );

              if (!edgeExists) {
                edges.push({
                  source: service.name,
                  target: networkService.name,
                  type: 'network',
                });
              }
            }
          }
        }
      } else {
        for (const service of config.services) {
          nodes.push({
            id: service,
            type: 'service',
            name: service,
          });
        }
      }
    }

    return { nodes, edges };
  }
}
