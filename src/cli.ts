#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { serveCommand } from './commands/serve.js';
import { mcpCommand } from './commands/mcp.js';
import { reviewCommand } from './commands/review.js';
import { timeTravelCommand } from './commands/time-travel.js';

const program = new Command();

program
  .name('arch-viz')
  .description('Local architecture analyzer for pnpm monorepos and Docker configs')
  .version('0.4.0');

program.addCommand(analyzeCommand);
program.addCommand(serveCommand);
program.addCommand(mcpCommand);
program.addCommand(reviewCommand);
program.addCommand(timeTravelCommand);

program.parse();
