import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Scanner } from '../core/scanner.js';
import { PathResolver } from '../core/path-resolver.js';
import { MermaidBuilder } from './mermaid-builder.js';
import { PortConflictDetector } from './port-conflict-detector.js';
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
      version: '0.1.0',
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
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP server started on stdio');
  }
}
