import { Command } from 'commander';
import { ExpressServer } from '../server/express-server.js';
import { openBrowser } from '../utils/browser-opener.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config.js';

export const serveCommand = new Command('serve')
  .description('Start visualization server')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('-port, --port <port>', 'Server port', String(getConfig().defaultPort))
  .option('-o, --open', 'Open browser automatically', true)
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      const port = parseInt(options.port, 10);
      
      logger.info(`Starting visualization server...`);
      logger.info(`Project path: ${options.path}`);
      logger.info(`Port: ${port}`);
      
      const server = new ExpressServer({
        port,
        projectPath: options.path,
      });
      
      await server.start();
      
      if (options.open) {
        setTimeout(() => {
          openBrowser(`http://localhost:${port}`);
        }, 1000);
      }
    } catch (error) {
      logger.error(`Server failed to start: ${error}`);
      process.exit(1);
    }
  });
