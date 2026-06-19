import { Command } from 'commander';
import { PathResolver } from '../core/path-resolver.js';
import { Scanner } from '../core/scanner.js';
import { Logger } from '../utils/logger.js';

export const analyzeCommand = new Command('analyze')
  .description('Analyze project structure')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('-f, --format <format>', 'Output format (json|text)', 'json')
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      logger.info(`Analyzing project at: ${options.path}`);
      
      const resolver = new PathResolver(options.path);
      const scanner = new Scanner(resolver);
      const result = await scanner.scan();

      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printTextReport(result, logger);
      }
    } catch (error) {
      logger.error(`Analysis failed: ${error}`);
      process.exit(1);
    }
  });

function printTextReport(result: Awaited<ReturnType<Scanner['scan']>>, logger: Logger): void {
  logger.info(`\nProject: ${result.name}`);
  logger.info(`Root: ${result.rootDir}`);
  logger.info(`\nPackages (${result.packages.length}):`);
  
  for (const pkg of result.packages) {
    logger.info(`  - ${pkg.name}@${pkg.version}`);
    if (pkg.dependencies.length > 0) {
      logger.info(`    Dependencies: ${pkg.dependencies.join(', ')}`);
    }
  }

  if (result.dockerConfigs.length > 0) {
    logger.info(`\nDocker Configs (${result.dockerConfigs.length}):`);
    for (const config of result.dockerConfigs) {
      logger.info(`  - ${config.path} (${config.type})`);
      if (config.services.length > 0) {
        logger.info(`    Services: ${config.services.join(', ')}`);
      }
    }
  }

  logger.info(`\nDependencies: ${result.dependencies.edges.length} connections`);
}
