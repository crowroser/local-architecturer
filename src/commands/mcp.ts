import { Command } from 'commander';
import { ArchitectureMcpServer } from '../mcp/server.js';
import { Logger } from '../utils/logger.js';

export const mcpCommand = new Command('mcp')
  .description('Start MCP server')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('-t, --transport <transport>', 'Transport type (stdio|http)', 'stdio')
  .option('-port, --port <port>', 'HTTP port (only for http transport)', '3001')
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      logger.info(`Starting MCP server...`);
      logger.info(`Project path: ${options.path}`);
      logger.info(`Transport: ${options.transport}`);
      
      if (options.transport === 'http') {
        logger.info(`HTTP Port: ${options.port}`);
        logger.warn('HTTP transport not yet implemented, using stdio');
      }
      
      const server = new ArchitectureMcpServer(options.path);
      await server.start();
    } catch (error) {
      logger.error(`MCP server failed to start: ${error}`);
      process.exit(1);
    }
  });
