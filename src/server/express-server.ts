import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Scanner } from '../core/scanner.js';
import { PathResolver } from '../core/path-resolver.js';
import { PortConflictDetector } from '../mcp/port-conflict-detector.js';
import { CircularDetector } from '../core/circular-detector.js';
import { DockerAuditor } from '../core/docker-auditor.js';
import { EnvAnalyzer } from '../core/env-analyzer.js';
import { AIProfiler } from '../core/ai-profiler.js';
import { GitHistoryScanner } from '../core/git-history-scanner.js';
import { CICDParser } from '../parsers/ci-cd-parser.js';
import { SecurityBoundaryAnalyzer } from '../core/security-boundary-analyzer.js';
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

    this.app.get('/api/circular', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        const cycles = CircularDetector.detect(result.dependencies);
        const affectedPackages = CircularDetector.getAffectedPackages(result.dependencies);
        
        res.json({
          hasCircularDependencies: cycles.length > 0,
          totalCycles: cycles.length,
          affectedPackages,
          cycles: cycles.map(c => ({
            path: c.cycle,
            edgeCount: c.edges.length,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to detect circular dependencies' });
      }
    });

    this.app.get('/api/docker-audit', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        const auditResult = DockerAuditor.audit(result.dockerConfigs);
        const deployIssues = DockerAuditor.auditDeploySettings(result.dockerConfigs);
        
        res.json({
          ...auditResult,
          deployIssues,
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to audit Docker security' });
      }
    });

    this.app.get('/api/env-coverage', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        const envAnalyzer = new EnvAnalyzer(this.resolver);
        const coverage = await envAnalyzer.analyze(result.dockerConfigs);
        res.json(coverage);
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze environment coverage' });
      }
    });

    this.app.get('/api/ai-profile', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        const allServices: DockerService[] = [];
        for (const config of result.dockerConfigs) {
          if (config.serviceDetails) {
            allServices.push(...config.serviceDetails);
          }
        }
        const profiler = new AIProfiler();
        const profile = profiler.profile(allServices);
        res.json(profile);
      } catch (error) {
        res.status(500).json({ error: 'Failed to profile AI models' });
      }
    });

    this.app.get('/api/history', async (req, res) => {
      try {
        const scanner = new GitHistoryScanner(this.resolver);
        const commits = parseInt(req.query.commits as string) || 100;
        const history = await scanner.scanHistory(commits);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: 'Failed to scan git history' });
      }
    });

    this.app.get('/api/history/:commit', async (req, res) => {
      try {
        const scanner = new GitHistoryScanner(this.resolver);
        const history = await scanner.scanHistory(1);
        const snapshot = history.find(s => s.commitHash === req.params.commit);
        if (snapshot) {
          res.json(snapshot);
        } else {
          res.status(404).json({ error: 'Commit not found' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to get commit snapshot' });
      }
    });

    this.app.get('/api/pipelines', async (req, res) => {
      try {
        const parser = new CICDParser(this.resolver);
        const pipelines = await parser.parseAll();
        res.json(pipelines);
      } catch (error) {
        res.status(500).json({ error: 'Failed to parse CI/CD pipelines' });
      }
    });

    this.app.get('/api/database', async (req, res) => {
      try {
        const schemas = await this.scanner.getDBSchemas();
        res.json(schemas);
      } catch (error) {
        res.status(500).json({ error: 'Failed to parse database schemas' });
      }
    });

    this.app.get('/api/proxy', async (req, res) => {
      try {
        const configs = await this.scanner.getProxyConfigs();
        res.json(configs);
      } catch (error) {
        res.status(500).json({ error: 'Failed to parse proxy configs' });
      }
    });

    this.app.get('/api/dataflow', async (req, res) => {
      try {
        const flows = await this.scanner.getDataFlows();
        res.json(flows);
      } catch (error) {
        res.status(500).json({ error: 'Failed to parse data flows' });
      }
    });

    this.app.get('/api/security-boundaries', async (req, res) => {
      try {
        const result = await this.scanner.scan();
        const analyzer = new SecurityBoundaryAnalyzer();
        const boundaries = analyzer.analyze(result.dockerConfigs);
        res.json(boundaries);
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze security boundaries' });
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
