#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { serveCommand } from './commands/serve.js';
import { mcpCommand } from './commands/mcp.js';

const program = new Command();

program
  .name('arch-viz')
  .description('Local architecture analyzer for pnpm monorepos and Docker configs')
  .version('0.1.0');

program.addCommand(analyzeCommand);
program.addCommand(serveCommand);
program.addCommand(mcpCommand);

program.parse();
