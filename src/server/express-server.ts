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
import { KubernetesParser } from '../parsers/kubernetes-parser.js';
import { Logger } from '../utils/logger.js';
import type { DockerService, ProjectStructure } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = new Logger('[Server] ');

interface CacheEntry<T> {
  data: T;
  expires: number;
}

export interface ServerOptions {
  port: number;
  projectPath: string;
}

export class ExpressServer {
  private app: express.Application;
  private scanner: Scanner;
  private resolver: PathResolver;
  private options: ServerOptions;
  private cache = new Map<string, CacheEntry<unknown>>();
  private cacheTtlMs = 30_000;

  constructor(options: ServerOptions) {
    this.options = options;
    this.app = express();
    this.resolver = new PathResolver(options.projectPath);
    this.scanner = new Scanner(this.resolver);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.cacheTtlMs,
    });
  }

  private async getScanResult(): Promise<ProjectStructure> {
    const cached = this.getFromCache<ProjectStructure>('scan');
    if (cached) return cached;
    const result = await this.scanner.scan();
    this.setCache('scan', result);
    return result;
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
    this.app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', projectPath: this.options.projectPath });
    });

    this.app.get('/api/graph', async (_req, res) => {
      try {
        const result = await this.getScanResult();
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
        logger.error(`Failed to scan project: ${error}`);
        res.status(500).json({ error: 'Failed to scan project' });
      }
    });

    this.app.get('/api/packages', async (_req, res) => {
      try {
        const result = await this.getScanResult();
        res.json(result.packages);
      } catch (error) {
        logger.error(`Failed to scan packages: ${error}`);
        res.status(500).json({ error: 'Failed to scan packages' });
      }
    });

    this.app.get('/api/docker', async (_req, res) => {
      try {
        const result = await this.getScanResult();
        
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
        logger.error(`Failed to scan Docker configs: ${error}`);
        res.status(500).json({ error: 'Failed to scan Docker configs' });
      }
    });

    this.app.get('/api/analyze', async (_req, res) => {
      try {
        const result = await this.getScanResult();
        res.json(result);
      } catch (error) {
        logger.error(`Failed to analyze project: ${error}`);
        res.status(500).json({ error: 'Failed to analyze project' });
      }
    });

    this.app.get('/api/circular', async (_req, res) => {
      try {
        const result = await this.getScanResult();
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
        logger.error(`Failed to detect circular dependencies: ${error}`);
        res.status(500).json({ error: 'Failed to detect circular dependencies' });
      }
    });

    this.app.get('/api/docker-audit', async (_req, res) => {
      try {
        const result = await this.getScanResult();
        const auditResult = DockerAuditor.audit(result.dockerConfigs);
        const deployIssues = DockerAuditor.auditDeploySettings(result.dockerConfigs);
        
        res.json({
          ...auditResult,
          deployIssues,
        });
      } catch (error) {
        logger.error(`Failed to audit Docker security: ${error}`);
        res.status(500).json({ error: 'Failed to audit Docker security' });
      }
    });

    this.app.get('/api/env-coverage', async (_req, res) => {
      try {
        const result = await this.getScanResult();
        const envAnalyzer = new EnvAnalyzer(this.resolver);
        const coverage = await envAnalyzer.analyze(result.dockerConfigs);
        res.json(coverage);
      } catch (error) {
        logger.error(`Failed to analyze environment coverage: ${error}`);
        res.status(500).json({ error: 'Failed to analyze environment coverage' });
      }
    });

    this.app.get('/api/ai-profile', async (_req, res) => {
      try {
        const result = await this.getScanResult();
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
        logger.error(`Failed to profile AI models: ${error}`);
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
        logger.error(`Failed to scan git history: ${error}`);
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
        logger.error(`Failed to get commit snapshot: ${error}`);
        res.status(500).json({ error: 'Failed to get commit snapshot' });
      }
    });

    this.app.get('/api/pipelines', async (_req, res) => {
      try {
        const parser = new CICDParser(this.resolver);
        const pipelines = await parser.parseAll();
        res.json(pipelines);
      } catch (error) {
        logger.error(`Failed to parse CI/CD pipelines: ${error}`);
        res.status(500).json({ error: 'Failed to parse CI/CD pipelines' });
      }
    });

    this.app.get('/api/database', async (_req, res) => {
      try {
        const schemas = await this.scanner.getDBSchemas();
        res.json(schemas);
      } catch (error) {
        logger.error(`Failed to parse database schemas: ${error}`);
        res.status(500).json({ error: 'Failed to parse database schemas' });
      }
    });

    this.app.get('/api/proxy', async (_req, res) => {
      try {
        const configs = await this.scanner.getProxyConfigs();
        res.json(configs);
      } catch (error) {
        logger.error(`Failed to parse proxy configs: ${error}`);
        res.status(500).json({ error: 'Failed to parse proxy configs' });
      }
    });

    this.app.get('/api/dataflow', async (_req, res) => {
      try {
        const flows = await this.scanner.getDataFlows();
        res.json(flows);
      } catch (error) {
        logger.error(`Failed to parse data flows: ${error}`);
        res.status(500).json({ error: 'Failed to parse data flows' });
      }
    });

    this.app.get('/api/security-boundaries', async (_req, res) => {
      try {
        const result = await this.getScanResult();
        const analyzer = new SecurityBoundaryAnalyzer();
        const boundaries = analyzer.analyze(result.dockerConfigs);
        res.json(boundaries);
      } catch (error) {
        logger.error(`Failed to analyze security boundaries: ${error}`);
        res.status(500).json({ error: 'Failed to analyze security boundaries' });
      }
    });

    this.app.get('/api/kubernetes', async (_req, res) => {
      try {
        const parser = new KubernetesParser(this.resolver);
        const analysis = await parser.parseAll();
        const nodes = parser.toGraphNodes(analysis);
        const edges = parser.toGraphEdges(analysis);
        res.json({ analysis, graph: { nodes, edges } });
      } catch (error) {
        logger.error(`Failed to analyze Kubernetes manifests: ${error}`);
        res.status(500).json({ error: 'Failed to analyze Kubernetes manifests' });
      }
    });

    this.app.post('/api/cache/invalidate', (_req, res) => {
      this.cache.clear();
      this.scanner.clearCache();
      res.json({ status: 'ok', message: 'Cache invalidated' });
    });

    const publicPath = path.join(__dirname, '../../dist/public');
    this.app.get('*', (_req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.app.listen(this.options.port, () => {
        logger.success(`Architecture Visualizer running at http://localhost:${this.options.port}`);
        logger.info('API Endpoints:');
        logger.info('  GET /api/health              - Health check');
        logger.info('  GET /api/graph               - Dependency graph');
        logger.info('  GET /api/packages            - Workspace packages');
        logger.info('  GET /api/docker              - Docker services');
        logger.info('  GET /api/analyze             - Full analysis');
        logger.info('  POST /api/cache/invalidate   - Clear scan cache');
        resolve();
      });
    });
  }
}
