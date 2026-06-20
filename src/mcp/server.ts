import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Scanner } from '../core/scanner.js';
import { PathResolver } from '../core/path-resolver.js';
import { MermaidBuilder } from './mermaid-builder.js';
import { PortConflictDetector } from './port-conflict-detector.js';
import { DockerfileParser } from '../parsers/dockerfile-parser.js';
import { CircularDetector } from '../core/circular-detector.js';
import { DockerAuditor } from '../core/docker-auditor.js';
import { EnvAnalyzer } from '../core/env-analyzer.js';
import { AIProfiler } from '../core/ai-profiler.js';
import { SecurityBoundaryAnalyzer } from '../core/security-boundary-analyzer.js';
import { ReviewEngine } from '../ai/review-engine.js';
import { GitHistoryScanner } from '../core/git-history-scanner.js';
import { CICDParser } from '../parsers/ci-cd-parser.js';
import { NginxParser } from '../parsers/nginx-parser.js';
import { PythonParser } from '../parsers/python-parser.js';
import { ComposerParser } from '../parsers/composer-parser.js';
import { WorkspaceParser } from '../parsers/workspace-parser.js';
import { DockerComposeParser } from '../parsers/docker-compose-parser.js';
import { EnvParser } from '../parsers/env-parser.js';
import { findModelByName, estimateVramFromParams } from '../utils/ai-model-database.js';
import { SequelizeParser } from '../parsers/sequelize-parser.js';
import { SQLAlchemyParser } from '../parsers/sqlalchemy-parser.js';
import { GatewayDetector } from '../core/gateway-detector.js';
import { DataFlowAnalyzer } from '../core/dataflow-analyzer.js';
import { BuildEdgeGenerator } from '../core/build-edge-generator.js';
import { RoutesEdgeGenerator } from '../core/routes-edge-generator.js';
import type { DockerService } from '../types/index.js';

export class ArchitectureMcpServer {
  private server: McpServer;
  private scanner: Scanner;
  private resolver: PathResolver;

  constructor(projectPath: string) {
    this.resolver = new PathResolver(projectPath);
    this.scanner = new Scanner(this.resolver);
    
    this.server = new McpServer({
      name: 'local-architecturer',
      version: '0.4.0',
    });

    this.registerTools();
  }

  private registerTools() {
    this.server.tool(
      'analyze_project',
      'Analyze the entire project structure including packages, Docker configs, dependencies, database schemas, proxy routing, data flows, security boundaries, AI models, and hardware devices',
      {
        path: z.string().optional().describe('Project root path (defaults to current directory)'),
      },
      async ({ path }) => {
        const scanner = path ? new Scanner(new PathResolver(path)) : this.scanner;
        const result = await scanner.scan();

        const [dbSchemas, proxyConfigs, dataFlows] = await Promise.all([
          scanner.getDBSchemas(),
          scanner.getProxyConfigs(),
          scanner.getDataFlows(),
        ]);

        const allServices = result.dockerConfigs.flatMap(c => c.serviceDetails || []);
        const securityAnalyzer = new SecurityBoundaryAnalyzer();
        const securityBoundaries = securityAnalyzer.analyze(result.dockerConfigs);

        const aiProfiler = new AIProfiler();
        const aiProfile = aiProfiler.profile(allServices);

        const hardwareDevices = result.dependencies.nodes.filter(n => n.type === 'hardware');

        const fullResult = {
          ...result,
          databaseSchemas: dbSchemas,
          proxyConfigs,
          dataFlows,
          securityBoundaries,
          aiProfile,
          hardwareDevices,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(fullResult, null, 2),
            },
          ],
        };
      }
    );

    this.server.tool(
      'get_packages',
      'Get all workspace packages with their dependencies',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.packages, null, 2),
            },
          ],
        };
      }
    );

    this.server.tool(
      'get_monorepo_graph',
      'Get monorepo dependency graph in JSON and Mermaid format',
      {
        path: z.string().optional().describe('Project root path'),
        format: z.enum(['json', 'mermaid', 'both']).optional()
          .describe('Output format: json, mermaid, or both (default: both)'),
      },
      async ({ path, format }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const graph = result.dependencies;
        const mermaid = MermaidBuilder.buildSubgraphByType(graph);
        
        let output: string;
        if (format === 'json') {
          output = JSON.stringify(graph, null, 2);
        } else if (format === 'mermaid') {
          output = mermaid;
        } else {
          output = `## JSON Format\n\n${JSON.stringify(graph, null, 2)}\n\n## Mermaid Format\n\n\`\`\`mermaid\n${mermaid}\n\`\`\``;
        }
        
        return {
          content: [{ type: 'text', text: output }],
        };
      }
    );

    this.server.tool(
      'get_docker_services',
      'Get Docker services with port conflict detection and volume analysis',
      {
        path: z.string().optional().describe('Project root path'),
        includeAnalysis: z.boolean().optional()
          .describe('Include port conflict and volume analysis (default: true)'),
      },
      async ({ path, includeAnalysis }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const allServices: DockerService[] = [];
        const allNetworks: string[] = [];
        
        for (const config of result.dockerConfigs) {
          if (config.serviceDetails) {
            allServices.push(...config.serviceDetails);
          }
          if (config.networks) {
            allNetworks.push(...config.networks);
          }
        }
        
        if (includeAnalysis !== false) {
          const analysis = PortConflictDetector.analyze(allServices, allNetworks);
          return {
            content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
          };
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result.dockerConfigs, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_dependency_graph',
      'Get the dependency graph with nodes and edges',
      {
        path: z.string().optional().describe('Project root path'),
        type: z.enum(['all', 'packages', 'services']).optional()
          .describe('Filter by type: all, packages, or services'),
      },
      async ({ path, type }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        let graph = result.dependencies;
        
        if (type === 'packages') {
          graph = {
            nodes: graph.nodes.filter(n => n.type === 'package'),
            edges: graph.edges.filter(e => 
              graph.nodes.some(n => n.id === e.source && n.type === 'package') &&
              graph.nodes.some(n => n.id === e.target && n.type === 'package')
            ),
          };
        } else if (type === 'services') {
          graph = {
            nodes: graph.nodes.filter(n => n.type === 'service'),
            edges: graph.edges.filter(e => 
              graph.nodes.some(n => n.id === e.source && n.type === 'service') &&
              graph.nodes.some(n => n.id === e.target && n.type === 'service')
            ),
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(graph, null, 2),
            },
          ],
        };
      }
    );

    this.server.tool(
      'get_node_details',
      'Get detailed information about a specific node (package or service) by ID',
      {
        nodeId: z.string().describe('Node ID (package name or service name)'),
        path: z.string().optional().describe('Project root path'),
      },
      async ({ nodeId, path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const node = result.dependencies.nodes.find(n => n.id === nodeId);
        if (!node) {
          return {
            content: [{ type: 'text', text: `Node '${nodeId}' not found` }],
            isError: true,
          };
        }
        
        const incomingEdges = result.dependencies.edges.filter(e => e.target === nodeId);
        const outgoingEdges = result.dependencies.edges.filter(e => e.source === nodeId);
        
        let details: Record<string, unknown> = { ...node };
        
        if (node.type === 'package') {
          const pkg = result.packages.find(p => p.name === nodeId);
          if (pkg) {
            details = { ...details, ...pkg };
          }
        } else if (node.type === 'service') {
          for (const config of result.dockerConfigs) {
            if (config.serviceDetails) {
              const service = config.serviceDetails.find(s => s.name === nodeId);
              if (service) {
                details = { ...details, ...service };
                break;
              }
            }
          }
        }
        
        const output = {
          node: details,
          relationships: {
            dependsOn: outgoingEdges.filter(e => e.type === 'depends').map(e => e.target),
            dependedBy: incomingEdges.filter(e => e.type === 'depends').map(e => e.source),
            networkConnections: outgoingEdges.filter(e => e.type === 'network').map(e => e.target),
          },
        };
        
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_service_details',
      'Get detailed information about a specific Docker service',
      {
        serviceName: z.string().describe('Name of the Docker service'),
        path: z.string().optional().describe('Project root path'),
      },
      async ({ serviceName, path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        for (const config of result.dockerConfigs) {
          if (config.serviceDetails) {
            const service = config.serviceDetails.find(s => s.name === serviceName);
            if (service) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(service, null, 2),
                  },
                ],
              };
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Service '${serviceName}' not found`,
            },
          ],
          isError: true,
        };
      }
    );

    this.server.tool(
      'get_package_details',
      'Get detailed information about a specific package',
      {
        packageName: z.string().describe('Name of the package'),
        path: z.string().optional().describe('Project root path'),
      },
      async ({ packageName, path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const pkg = result.packages.find(p => p.name === packageName);
        if (pkg) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(pkg, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Package '${packageName}' not found`,
            },
          ],
          isError: true,
        };
      }
    );

    this.server.tool(
      'analyze_dockerfile',
      'Analyze a Dockerfile for base image, exposed ports, build args, and multi-stage builds',
      {
        path: z.string().describe('Path to the Dockerfile'),
        projectPath: z.string().optional().describe('Project root path'),
      },
      async ({ path, projectPath }) => {
        const resolver = projectPath ? new PathResolver(projectPath) : this.resolver;
        const parser = new DockerfileParser(resolver);
        const result = parser.parse(path);
        
        if (!result) {
          return {
            content: [{ type: 'text', text: `Dockerfile not found or invalid: ${path}` }],
            isError: true,
          };
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_health_score',
      'Calculate a health score for the project based on dependency complexity and structure',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const packageCount = result.packages.length;
        const serviceCount = result.dockerConfigs.reduce(
          (sum, c) => sum + (c.serviceDetails?.length || 0), 0
        );
        const edgeCount = result.dependencies.edges.length;
        
        let score = 100;
        const issues: string[] = [];
        
        if (packageCount > 20) {
          score -= 10;
          issues.push('High package count (>20)');
        }
        
        if (serviceCount > 10) {
          score -= 10;
          issues.push('High service count (>10)');
        }
        
        if (edgeCount > packageCount * 3) {
          score -= 15;
          issues.push('Complex dependency graph');
        }
        
        const hasCircularDeps = CircularDetector.hasCircularDependencies(result.dependencies);
        if (hasCircularDeps) {
          score -= 20;
          issues.push('Circular dependencies detected');
        }
        
        const output = {
          score: Math.max(0, score),
          rating: score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor',
          metrics: {
            packages: packageCount,
            services: serviceCount,
            edges: edgeCount,
          },
          issues,
        };
        
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      }
    );

    this.server.tool(
      'search_packages',
      'Search for packages by name or keyword',
      {
        query: z.string().describe('Search query (package name or keyword)'),
        path: z.string().optional().describe('Project root path'),
      },
      async ({ query, path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const searchTerm = query.toLowerCase();
        const matchingPackages = result.packages.filter(pkg => 
          pkg.name.toLowerCase().includes(searchTerm)
        );
        
        return {
          content: [{ type: 'text', text: JSON.stringify(matchingPackages, null, 2) }],
        };
      }
    );

    this.server.tool(
      'detect_circular_dependencies',
      'Detect circular dependencies in the project and return affected packages and cycles',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const cycles = CircularDetector.detect(result.dependencies);
        const affectedPackages = CircularDetector.getAffectedPackages(result.dependencies);
        
        const output = {
          hasCircularDependencies: cycles.length > 0,
          totalCycles: cycles.length,
          affectedPackages,
          cycles: cycles.map(c => ({
            path: c.cycle,
            edgeCount: c.edges.length,
          })),
        };
        
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      }
    );

    this.server.tool(
      'audit_docker_security',
      'Audit Docker services for security issues, resource limits, and best practices',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const auditResult = DockerAuditor.audit(result.dockerConfigs);
        const deployIssues = DockerAuditor.auditDeploySettings(result.dockerConfigs);
        
        const output = {
          ...auditResult,
          deployIssues,
          recommendations: [
            ...auditResult.issues.filter(i => i.severity === 'error').map(i => `Fix: ${i.message}`),
            ...auditResult.issues.filter(i => i.severity === 'warning').map(i => `Consider: ${i.message}`),
          ],
        };
        
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_env_coverage',
      'Analyze environment variable coverage between .env files, source code, and Docker services',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const envAnalyzer = new EnvAnalyzer(resolver);
        const coverage = await envAnalyzer.analyze(result.dockerConfigs);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(coverage, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_database_schemas',
      'Get database schemas from Prisma, Laravel, TypeORM, Drizzle configurations',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const schemas = await scanner.getDBSchemas();
        
        return {
          content: [{ type: 'text', text: JSON.stringify(schemas, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_proxy_configurations',
      'Get reverse proxy routing configurations from Traefik, Nginx, Caddy',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const configs = await scanner.getProxyConfigs();
        
        return {
          content: [{ type: 'text', text: JSON.stringify(configs, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_data_flows',
      'Get data processing pipeline configurations and auto-detected flows',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const flows = await scanner.getDataFlows();
        
        return {
          content: [{ type: 'text', text: JSON.stringify(flows, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_security_boundaries',
      'Analyze security boundaries for volume mounts, permissions, and sensitive paths',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const analyzer = new SecurityBoundaryAnalyzer();
        const boundaries = analyzer.analyze(result.dockerConfigs);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(boundaries, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_ai_profile',
      'Profile AI models from Docker images and calculate VRAM requirements',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const allServices: DockerService[] = [];
        for (const config of result.dockerConfigs) {
          if (config.serviceDetails) {
            allServices.push(...config.serviceDetails);
          }
        }
        
        const profiler = new AIProfiler();
        const profile = profiler.profile(allServices);
        
        return {
          content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_hardware_devices',
      'Detect hardware devices (serial, USB, GPIO) from Docker configurations',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        
        const hardwareNodes = result.dependencies.nodes.filter(n => n.type === 'hardware');
        const hardwareEdges = result.dependencies.edges.filter(e => e.type === 'connects');
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ devices: hardwareNodes, connections: hardwareEdges }, null, 2) 
          }],
        };
      }
    );

    this.server.tool(
      'review_architecture',
      'AI-powered architecture review using LLM (Ollama, OpenRouter, or LM Studio)',
      {
        path: z.string().optional().describe('Project root path'),
        provider: z.enum(['ollama', 'openrouter', 'lmstudio']).optional()
          .describe('LLM provider (default: ollama)'),
        model: z.string().optional().describe('Model name (default: qwen2.5)'),
        baseUrl: z.string().optional().describe('Custom API base URL'),
        apiKey: z.string().optional().describe('API key for OpenRouter'),
      },
      async ({ path, provider, model, baseUrl, apiKey }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();

        const config = {
          provider: provider || 'ollama',
          model: model || 'qwen2.5',
          baseUrl,
          apiKey,
        };

        const engine = new ReviewEngine(config);
        const review = await engine.review(result as unknown as Record<string, unknown>);

        return {
          content: [{ type: 'text', text: JSON.stringify(review, null, 2) }],
        };
      }
    );

    this.server.tool(
      'time_travel',
      'Scan git history and show architectural evolution over time',
      {
        path: z.string().optional().describe('Project root path'),
        commits: z.number().optional().describe('Number of recent commits to scan (default: 100)'),
      },
      async ({ path, commits }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new GitHistoryScanner(resolver);
        const history = await scanner.scanHistory(commits || 100);

        return {
          content: [{ type: 'text', text: JSON.stringify(history, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_ci_cd_pipelines',
      'Get CI/CD pipeline configurations from GitHub Actions, GitLab CI, Jenkins, CircleCI',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new CICDParser(resolver);
        const pipelines = await parser.parseAll();

        return {
          content: [{ type: 'text', text: JSON.stringify(pipelines, null, 2) }],
        };
      }
    );

    this.server.tool(
      'lookup_ai_model',
      'Look up AI model VRAM requirements by name or estimate from parameter count',
      {
        modelName: z.string().optional().describe('AI model name (e.g., llama-3-8b, qwen-2-7b)'),
        paramsBillion: z.number().optional().describe('Parameter count in billions for VRAM estimation'),
      },
      async ({ modelName, paramsBillion }) => {
        if (modelName) {
          const model = findModelByName(modelName);
          if (!model) {
            return {
              content: [{ type: 'text', text: `Model '${modelName}' not found in database` }],
              isError: true,
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(model, null, 2) }],
          };
        } else if (paramsBillion !== undefined) {
          const estimatedVram = estimateVramFromParams(paramsBillion);
          return {
            content: [{ type: 'text', text: JSON.stringify({
              paramsBillion,
              estimatedVramGB: estimatedVram,
              note: 'Estimation based on ~2.4x parameter count',
            }, null, 2) }],
          };
        } else {
          return {
            content: [{ type: 'text', text: 'Provide either modelName or paramsBillion' }],
            isError: true,
          };
        }
      }
    );

    this.server.tool(
      'parse_nginx_config',
      'Parse a specific Nginx configuration file for server blocks and proxy routes',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new NginxParser(resolver);
        const configs = await parser.parseAll();

        return {
          content: [{ type: 'text', text: JSON.stringify(configs, null, 2) }],
        };
      }
    );

    this.server.tool(
      'parse_python_dependencies',
      'Parse Python dependencies from requirements*.txt and pyproject.toml files',
      {
        path: z.string().optional().describe('Project root path'),
        file: z.string().optional().describe('Specific file path to parse (e.g., requirements.txt)'),
      },
      async ({ path, file }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new PythonParser(resolver);

        if (file) {
          if (file.includes('requirements')) {
            const result = parser.parseRequirements(file);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          } else if (file.includes('pyproject.toml')) {
            const result = parser.parsePyprojectToml(file);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }
        }

        const packages = parser.parseAll();
        return {
          content: [{ type: 'text', text: JSON.stringify(packages, null, 2) }],
        };
      }
    );

    this.server.tool(
      'parse_composer_packages',
      'Parse PHP/Composer dependencies from composer.json files',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new ComposerParser(resolver);
        const packages = parser.parseAll();

        return {
          content: [{ type: 'text', text: JSON.stringify(packages, null, 2) }],
        };
      }
    );

    this.server.tool(
      'parse_workspace_config',
      'Detect monorepo workspace configuration (pnpm, npm, yarn)',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new WorkspaceParser(resolver);
        const config = parser.parse();

        return {
          content: [{ type: 'text', text: JSON.stringify(config, null, 2) }],
        };
      }
    );

    this.server.tool(
      'parse_docker_compose_file',
      'Parse a specific Docker Compose file for services, ports, volumes, and networks',
      {
        filePath: z.string().describe('Path to docker-compose file (e.g., docker-compose.yml)'),
        projectPath: z.string().optional().describe('Project root path'),
      },
      async ({ filePath, projectPath }) => {
        const resolver = projectPath ? new PathResolver(projectPath) : this.resolver;
        const parser = new DockerComposeParser(resolver);
        const result = parser.parse(filePath);

        if (!result) {
          return {
            content: [{ type: 'text', text: `Docker Compose file not found or invalid: ${filePath}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_mermaid_diagram',
      'Generate Mermaid diagram from dependency graph with optional grouping',
      {
        path: z.string().optional().describe('Project root path'),
        variant: z.enum(['flowchart', 'subgraph']).optional()
          .describe('Diagram variant: flowchart (flat) or subgraph (grouped by type, default)'),
      },
      async ({ path, variant }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();

        const graph = result.dependencies;
        const mermaid = variant === 'flowchart'
          ? MermaidBuilder.buildFlowchart(graph)
          : MermaidBuilder.buildSubgraphByType(graph);

        return {
          content: [{ type: 'text', text: mermaid }],
        };
      }
    );

    this.server.tool(
      'analyze_env_file',
      'Parse a specific .env file and extract environment variables',
      {
        filePath: z.string().describe('Path to env file (e.g., .env, .env.example)'),
        projectPath: z.string().optional().describe('Project root path'),
      },
      async ({ filePath, projectPath }) => {
        const resolver = projectPath ? new PathResolver(projectPath) : this.resolver;
        const parser = new EnvParser(resolver);
        const result = parser.parseEnvFile(filePath);

        if (!result) {
          return {
            content: [{ type: 'text', text: `Env file not found: ${filePath}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    this.server.tool(
      'detect_port_conflicts',
      'Detect port conflicts across Docker services and analyze volume mappings',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();

        const allServices: DockerService[] = [];
        const allNetworks: string[] = [];

        for (const config of result.dockerConfigs) {
          if (config.serviceDetails) {
            allServices.push(...config.serviceDetails);
          }
          if (config.networks) {
            allNetworks.push(...config.networks);
          }
        }

        const analysis = PortConflictDetector.analyze(allServices, allNetworks);

        return {
          content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
        };
      }
    );

    this.server.tool(
      'parse_sequelize_models',
      'Parse Sequelize ORM model files for tables, columns, and relations',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new SequelizeParser(resolver);
        const schemas = parser.parseAll();

        return {
          content: [{ type: 'text', text: JSON.stringify(schemas, null, 2) }],
        };
      }
    );

    this.server.tool(
      'parse_sqlalchemy_models',
      'Parse SQLAlchemy ORM model files for tables, columns, and relations',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const parser = new SQLAlchemyParser(resolver);
        const schemas = parser.parseAll();

        return {
          content: [{ type: 'text', text: JSON.stringify(schemas, null, 2) }],
        };
      }
    );

    this.server.tool(
      'detect_gateways',
      'Detect API gateways and reverse proxies from proxy configurations',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const detector = new GatewayDetector(resolver);
        const gateways = await detector.detect();

        return {
          content: [{ type: 'text', text: JSON.stringify(gateways, null, 2) }],
        };
      }
    );

    this.server.tool(
      'analyze_dataflow_bottlenecks',
      'Analyze data flow pipelines for bottlenecks and latency',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const flows = await scanner.getDataFlows();

        const analyzer = new DataFlowAnalyzer();
        const analysis = analyzer.analyzeFlows(flows);

        return {
          content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_build_edges',
      'Generate dependency edges from CI/CD pipeline build relationships',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();

        const cicdParser = new CICDParser(resolver);
        const pipelines = await cicdParser.parseAll();

        const generator = new BuildEdgeGenerator();
        const edges = generator.generate(pipelines, result.dependencies);

        return {
          content: [{ type: 'text', text: JSON.stringify(edges, null, 2) }],
        };
      }
    );

    this.server.tool(
      'get_routes_edges',
      'Generate dependency edges from proxy routing configurations',
      {
        path: z.string().optional().describe('Project root path'),
      },
      async ({ path }) => {
        const resolver = path ? new PathResolver(path) : this.resolver;
        const scanner = new Scanner(resolver);
        const result = await scanner.scan();
        const proxyConfigs = await scanner.getProxyConfigs();

        const generator = new RoutesEdgeGenerator();
        const edges = generator.generate(proxyConfigs, result.dependencies);

        return {
          content: [{ type: 'text', text: JSON.stringify(edges, null, 2) }],
        };
      }
    );
  }

  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP server started on stdio');
  }

  async startHttp(port: number = 3001) {
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const express = await import('express');
    
    const app = express.default();
    app.use(express.default.json());
    
    app.post('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      
      await this.server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
    
    app.get('/mcp', async (req, res) => {
      res.json({ status: 'ok', server: 'local-architecturer' });
    });
    
    app.listen(port, () => {
      console.error(`MCP server started on http://localhost:${port}/mcp`);
    });
  }
}
