import { PathResolver } from './path-resolver.js';
import { DockerScanner } from './docker-scanner.js';
import { WorkspaceParser } from '../parsers/workspace-parser.js';
import { PackageParser } from '../parsers/package-parser.js';
import { DependencyParser } from '../parsers/dependency-parser.js';
import { ComposerParser } from '../parsers/composer-parser.js';
import { PythonParser } from '../parsers/python-parser.js';
import { HardwareParser } from '../parsers/hardware-parser.js';
import { DBSchemaParser } from '../parsers/db-schema-parser.js';
import { ProxyParser } from '../parsers/proxy-parser.js';
import { DataFlowParser } from '../parsers/dataflow-parser.js';
import { SequelizeParser } from '../parsers/sequelize-parser.js';
import { SQLAlchemyParser } from '../parsers/sqlalchemy-parser.js';
import { GatewayDetector } from './gateway-detector.js';
import type { ProjectStructure, DependencyGraph, DependencyNode, DependencyEdge, PackageInfo } from '../types/index.js';

export class Scanner {
  private resolver: PathResolver;
  private dockerScanner: DockerScanner;
  private workspaceParser: WorkspaceParser;
  private packageParser: PackageParser;
  private composerParser: ComposerParser;
  private pythonParser: PythonParser;
  private hardwareParser: HardwareParser;
  private dbSchemaParser: DBSchemaParser;
  private proxyParser: ProxyParser;
  private dataFlowParser: DataFlowParser;
  private sequelizeParser: SequelizeParser;
  private sqlalchemyParser: SQLAlchemyParser;
  private gatewayDetector: GatewayDetector;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.dockerScanner = new DockerScanner(resolver);
    this.workspaceParser = new WorkspaceParser(resolver);
    this.packageParser = new PackageParser(resolver);
    this.composerParser = new ComposerParser(resolver);
    this.pythonParser = new PythonParser(resolver);
    this.hardwareParser = new HardwareParser();
    this.dbSchemaParser = new DBSchemaParser(resolver);
    this.proxyParser = new ProxyParser(resolver);
    this.dataFlowParser = new DataFlowParser(resolver);
    this.sequelizeParser = new SequelizeParser(resolver);
    this.sqlalchemyParser = new SQLAlchemyParser(resolver);
    this.gatewayDetector = new GatewayDetector(resolver);
  }

  async scan(): Promise<ProjectStructure> {
    const parsedPackages = this.scanPackages();
    const phpPackages = this.scanPhpPackages();
    const pythonPackages = this.scanPythonPackages();
    
    const dockerConfigs = await this.dockerScanner.scan();
    
    const allPackages = [...parsedPackages];
    const dependencies = this.buildDependencyGraph(allPackages, dockerConfigs);
    
    this.addExternalPackages(dependencies, phpPackages, pythonPackages);

    const gateways = await this.gatewayDetector.detect();
    const gatewayNodes = this.gatewayDetector.toGraphNodes(gateways);
    const gatewayEdges = this.gatewayDetector.toGraphEdges(gateways);
    dependencies.nodes.push(...gatewayNodes);
    dependencies.edges.push(...gatewayEdges);

    const packages: PackageInfo[] = [
      ...allPackages.map(p => ({
        name: p.name,
        version: p.version,
        path: p.path,
        dependencies: Object.keys(p.dependencies),
        devDependencies: Object.keys(p.devDependencies),
        type: 'node' as const,
        language: 'javascript',
      })),
      ...phpPackages.map(p => ({
        name: p.name,
        version: p.version || '*',
        path: p.path,
        dependencies: p.dependencies,
        devDependencies: p.devDependencies,
        type: 'php' as const,
        language: 'php',
      })),
      ...pythonPackages.map(p => ({
        name: p.name,
        version: p.version || '*',
        path: p.path,
        dependencies: p.dependencies,
        devDependencies: p.devDependencies,
        type: 'python' as const,
        language: 'python',
      })),
    ];

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

  private scanPhpPackages() {
    return this.composerParser.parseAll();
  }

  private scanPythonPackages() {
    return this.pythonParser.parseAll();
  }

  private addExternalPackages(
    graph: DependencyGraph,
    phpPackages: Array<{ name: string; dependencies: string[] }>,
    pythonPackages: Array<{ name: string; dependencies: string[] }>
  ): void {
    for (const pkg of phpPackages) {
      const nodeExists = graph.nodes.some(n => n.id === pkg.name);
      if (!nodeExists) {
        graph.nodes.push({
          id: pkg.name,
          type: 'package',
          name: pkg.name,
          metadata: { language: 'php' },
        });
      }
    }

    for (const pkg of pythonPackages) {
      const nodeExists = graph.nodes.some(n => n.id === pkg.name);
      if (!nodeExists) {
        graph.nodes.push({
          id: pkg.name,
          type: 'package',
          name: pkg.name,
          metadata: { language: 'python' },
        });
      }
    }
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
        const allDevices = this.hardwareParser.parseFromServices(config.serviceDetails);
        const hardwareNodes = this.hardwareParser.toGraphNodes(allDevices);
        const hardwareEdges = this.hardwareParser.toGraphEdges(allDevices);

        nodes.push(...hardwareNodes);
        edges.push(...hardwareEdges);

        for (const service of config.serviceDetails) {
          const nodeExists = nodes.some(n => n.id === service.name);
          if (!nodeExists) {
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
          }

          for (const volume of service.volumes) {
            if (volume.source.includes('/')) {
              const volumeNodeId = `vol-${service.name}-${volume.source.replace(/[^a-zA-Z0-9]/g, '-')}`;
              const volNodeExists = nodes.some(n => n.id === volumeNodeId);
              if (!volNodeExists) {
                nodes.push({
                  id: volumeNodeId,
                  type: 'database',
                  name: volume.source.split('/').pop() || volume.source,
                  metadata: {
                    path: volume.source,
                    isVolume: true,
                  },
                });
              }
              edges.push({
                source: service.name,
                target: volumeNodeId,
                type: 'volume',
              });
            }
          }

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

  async getDBSchemas() {
    const baseSchemas = await this.dbSchemaParser.parseAll();
    const sequelizeSchemas = this.sequelizeParser.parseAll();
    const sqlalchemySchemas = this.sqlalchemyParser.parseAll();
    return [...baseSchemas, ...sequelizeSchemas, ...sqlalchemySchemas];
  }

  async getProxyConfigs() {
    const dockerConfigs = await this.dockerScanner.scan();
    const allServices = dockerConfigs.flatMap(c => c.serviceDetails || []);
    return this.proxyParser.parseAll(allServices);
  }

  async getDataFlows() {
    const dockerConfigs = await this.dockerScanner.scan();
    const allServices = dockerConfigs.flatMap(c => c.serviceDetails || []);
    return this.dataFlowParser.parseAll(allServices);
  }
}
