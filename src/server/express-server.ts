import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Scanner } from '../core/scanner.js';
import { PathResolver } from '../core/path-resolver.js';
import { PortConflictDetector } from '../mcp/port-conflict-detector.js';
import type { DockerService } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port: number;
  projectPath: string;
}

export class ExpressServer {
  private app: express.Application;
  private scanner: Scanner;
  private resolver: PathResolver;
  private options: ServerOptions;

  constructor(options: ServerOptions) {
    this.options = options;
    this.app = express();
    this.resolver = new PathResolver(options.projectPath);
    this.scanner = new Scanner(this.resolver);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupStaticFiles() {
    const publicPath = path.join(__dirname, '../../dist/public');
    this.app.use(express.static(publicPath));
  }

  private setupRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', projectPath: this.options.projectPath });
    });

    this.app.get('/api/graph', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        res.json({
          nodes: result.dependencies.nodes,
          edges: result.dependencies.edges,
          metadata: {
            name: result.name,
            rootDir: result.rootDir,
            packageCount: result.packages.length,
            dockerServiceCount: result.dockerConfigs.reduce(
              (sum, c) => sum + (c.serviceDetails?.length || 0), 0
            ),
          },
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to scan project' });
      }
    });

    this.app.get('/api/packages', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        res.json(result.packages);
      } catch (error) {
        res.status(500).json({ error: 'Failed to scan packages' });
      }
    });

    this.app.get('/api/docker', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        
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
        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: 'Failed to scan Docker configs' });
      }
    });

    this.app.get('/api/analyze', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze project' });
      }
    });

    // SPA fallback
    const publicPath = path.join(__dirname, '../../dist/public');
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.app.listen(this.options.port, () => {
        console.log(`\n  🚀 Architecture Visualizer running at:`);
        console.log(`     http://localhost:${this.options.port}`);
        console.log(`\n  API Endpoints:`);
        console.log(`     GET /api/health    - Health check`);
        console.log(`     GET /api/graph     - Dependency graph`);
        console.log(`     GET /api/packages  - Workspace packages`);
        console.log(`     GET /api/docker    - Docker services`);
        console.log(`     GET /api/analyze   - Full analysis\n`);
        resolve();
      });
    });
  }
}
