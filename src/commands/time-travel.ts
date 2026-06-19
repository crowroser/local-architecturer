import { Command } from 'commander';
import { PathResolver } from '../core/path-resolver.js';
import { GitHistoryScanner } from '../core/git-history-scanner.js';
import { Logger } from '../utils/logger.js';

export const timeTravelCommand = new Command('time-travel')
  .description('Scan git history and show architectural evolution')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('-c, --commits <n>', 'Number of commits to scan', '100')
  .option('-f, --format <format>', 'Output format (json|text)', 'json')
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      const maxCommits = parseInt(options.commits, 10);
      logger.info(`Scanning git history (last ${maxCommits} commits)...`);
      
      const resolver = new PathResolver(options.path);
      const scanner = new GitHistoryScanner(resolver);
      const history = await scanner.scanHistory(maxCommits);

      if (options.format === 'json') {
        console.log(JSON.stringify(history, null, 2));
      } else {
        printHistoryReport(history, logger);
      }
    } catch (error) {
      logger.error(`Time travel failed: ${error}`);
      process.exit(1);
    }
  });

function printHistoryReport(history: Awaited<ReturnType<GitHistoryScanner['scanHistory']>>, logger: Logger): void {
  if (history.length === 0) {
    logger.info('No git history found.');
    return;
  }

  logger.info(`\nArchitecture Evolution (${history.length} commits):\n`);
  
  for (const snapshot of history) {
    logger.info(`${snapshot.commitHash} - ${snapshot.message}`);
    logger.info(`  Author: ${snapshot.author} | ${snapshot.timestamp}`);
    logger.info(`  Packages: ${snapshot.packageCount} | Services: ${snapshot.serviceCount}`);
    logger.info('');
  }

  if (history.length >= 2) {
    const first = history[history.length - 1];
    const last = history[0];
    const packageDelta = last.packageCount - first.packageCount;
    const serviceDelta = last.serviceCount - first.serviceCount;
    
    logger.info('Summary:');
    logger.info(`  Packages: ${first.packageCount} → ${last.packageCount} (${packageDelta >= 0 ? '+' : ''}${packageDelta})`);
    logger.info(`  Services: ${first.serviceCount} → ${last.serviceCount} (${serviceDelta >= 0 ? '+' : ''}${serviceDelta})`);
  }
}
