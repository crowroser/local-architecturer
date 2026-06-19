import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import { PrismaParser } from './prisma-parser.js';
import { LaravelMigrationParser } from './laravel-migration-parser.js';
import { TypeORMParser } from './typeorm-parser.js';
import { DrizzleParser } from './drizzle-parser.js';
import type { DatabaseSchema } from '../types/database.js';

export class DBSchemaParser {
  private resolver: PathResolver;
  private logger: Logger;
  private parsers: Array<{ name: string; parser: { parseAll(): Promise<DatabaseSchema[]> } }>;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[DBSchemaParser] ');
    this.parsers = [
      { name: 'Prisma', parser: new PrismaParser(resolver) },
      { name: 'Laravel', parser: new LaravelMigrationParser(resolver) },
      { name: 'TypeORM', parser: new TypeORMParser(resolver) },
      { name: 'Drizzle', parser: new DrizzleParser(resolver) },
    ];
  }

  async parseAll(): Promise<DatabaseSchema[]> {
    const allSchemas: DatabaseSchema[] = [];

    for (const { name, parser } of this.parsers) {
      try {
        const schemas = await parser.parseAll();
        if (schemas.length > 0) {
          this.logger.debug(`Found ${schemas.length} schema(s) from ${name}`);
          allSchemas.push(...schemas);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse ${name}: ${error}`);
      }
    }

    return allSchemas;
  }
}
