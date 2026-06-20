import { Command } from 'commander';
import { PathResolver } from '../core/path-resolver.js';
import { Scanner } from '../core/scanner.js';
import { ReviewEngine } from '../ai/review-engine.js';
import type { ReviewConfig } from '../ai/review-engine.js';
import { Logger } from '../utils/logger.js';

export const reviewCommand = new Command('review')
  .description('AI-powered architecture review')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('--provider <provider>', 'LLM provider (ollama|openrouter|lmstudio)', 'ollama')
  .option('--model <model>', 'Model name', 'qwen2.5')
  .option('--base-url <url>', 'Custom API base URL')
  .option('--api-key <key>', 'API key for OpenRouter')
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      logger.info(`Reviewing project at: ${options.path}`);
      logger.info(`Using provider: ${options.provider}, model: ${options.model}`);
      
      const resolver = new PathResolver(options.path);
      const scanner = new Scanner(resolver);
      const result = await scanner.scan();

      const config: ReviewConfig = {
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
      };

      const engine = new ReviewEngine(config);
      const review = await engine.review(result as unknown as Record<string, unknown>);

      console.log('\n' + '='.repeat(60));
      console.log('🏗️  Architecture Review Results');
      console.log('='.repeat(60));
      console.log(`\n📊 Score: ${review.score}/100`);
      console.log(`📝 Summary: ${review.summary}\n`);

      if (review.recommendations.length > 0) {
        console.log('Recommendations:');
        console.log('-'.repeat(40));
        
        const grouped = {
          critical: review.recommendations.filter(r => r.severity === 'critical'),
          warning: review.recommendations.filter(r => r.severity === 'warning'),
          info: review.recommendations.filter(r => r.severity === 'info'),
        };

        for (const rec of grouped.critical) {
          logger.error(`[${rec.category}] ${rec.message}`);
          if (rec.affectedComponents.length > 0) {
            console.log(`  Affected: ${rec.affectedComponents.join(', ')}`);
          }
        }

        for (const rec of grouped.warning) {
          logger.warn(`[${rec.category}] ${rec.message}`);
          if (rec.affectedComponents.length > 0) {
            console.log(`  Affected: ${rec.affectedComponents.join(', ')}`);
          }
        }

        for (const rec of grouped.info) {
          logger.info(`[${rec.category}] ${rec.message}`);
          if (rec.affectedComponents.length > 0) {
            console.log(`  Affected: ${rec.affectedComponents.join(', ')}`);
          }
        }
      } else {
        console.log('No recommendations found.');
      }

      console.log('\n' + '='.repeat(60));
    } catch (error) {
      logger.error(`Review failed: ${error}`);
      process.exit(1);
    }
  });
