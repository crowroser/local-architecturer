import { Command } from 'commander';
import { PathResolver } from '../core/path-resolver.js';
import { Scanner } from '../core/scanner.js';
import { ReviewEngine } from '../ai/review-engine.js';
import type { ReviewConfig } from '../ai/review-engine.js';
import { Logger } from '../utils/logger.js';
import { getConfig } from '../config.js';

export const reviewCommand = new Command('review')
  .description('AI-powered architecture review')
  .option('-p, --path <path>', 'Project root path', process.cwd())
  .option('--provider <provider>', 'LLM provider (ollama|openrouter|lmstudio)')
  .option('--model <model>', 'Model name')
  .option('--base-url <url>', 'Custom API base URL')
  .option(
    '--api-key <key>',
    '[deprecated] API key. Use ARCHVIZ_OPENROUTER_API_KEY env var instead (avoids shell-history leakage).'
  )
  .action(async (options) => {
    const logger = new Logger();
    const config = getConfig();

    // CLI flag overrides env/config; env var is the preferred secret channel.
    const provider = options.provider ?? config.aiProvider;
    const model = options.model ?? config.aiModel;
    const baseUrl = options.baseUrl ?? config.aiBaseUrl;
    // Prefer env-var key; fall back to the (deprecated) CLI flag only if explicitly set.
    const apiKey = config.aiApiKey ?? options.apiKey;

    if (options.apiKey) {
      logger.warn(
        'Passing --api-key on the CLI leaks the key into shell history and process lists. ' +
          'Set ARCHVIZ_OPENROUTER_API_KEY instead.'
      );
    }

    if (provider === 'openrouter' && !apiKey) {
      logger.error(
        'OpenRouter requires an API key. Set ARCHVIZ_OPENROUTER_API_KEY (recommended) or pass --api-key.'
      );
      process.exit(1);
    }

    try {
      logger.info(`Reviewing project at: ${options.path}`);
      logger.info(`Using provider: ${provider}, model: ${model}`);

      const resolver = new PathResolver(options.path);
      const scanner = new Scanner(resolver);
      const result = await scanner.scan();

      const reviewConfig: ReviewConfig = {
        provider,
        model,
        baseUrl,
        apiKey,
        timeoutMs: config.aiTimeoutMs,
      };

      const engine = new ReviewEngine(reviewConfig);
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
