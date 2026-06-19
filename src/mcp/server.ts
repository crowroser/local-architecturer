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
      version: '0.3.0',
    });

    this.registerTools();
  }

  private registerTools() {
    this.server.tool(
      'analyze_project',
      'Analyze the entire project structure including packages, Docker configs, and dependencies',
      {
        path: z.string().optional().describe('Project root path (defaults to current directory)'),
      },
      async ({ path }) => {
        const scanner = path ? new Scanner(new PathResolver(path)) : this.scanner;
        const result = await scanner.scan();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
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
