import { Command } from 'commander';
import { ArchitectureMcpServer } from '../mcp/server.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config.js';

export const mcpCommand = new Command('mcp')
  .description('Start MCP server')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('-t, --transport <transport>', 'Transport type (stdio|http)', 'stdio')
  .option('-port, --port <port>', 'HTTP port (only for http transport)', String(getConfig().defaultMcpPort))
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      logger.info(`Starting MCP server...`);
      logger.info(`Project path: ${options.path}`);
      logger.info(`Transport: ${options.transport}`);
      
      const server = new ArchitectureMcpServer(options.path);
      
      if (options.transport === 'http') {
        logger.info(`HTTP Port: ${options.port}`);
        await server.startHttp(parseInt(options.port));
      } else {
        await server.startStdio();
      }
    } catch (error) {
      logger.error(`MCP server failed to start: ${error}`);
      process.exit(1);
    }
  });
