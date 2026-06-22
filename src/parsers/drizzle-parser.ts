import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseSchema, DBTable, DBColumn, DBRelation } from '../types/database.js';

export class DrizzleParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[DrizzleParser] ');
  }

  async parseAll(): Promise<DatabaseSchema[]> {
    const files = this.resolver.findFilesSync('**/*schema*.ts');
    const schemas: DatabaseSchema[] = [];

    for (const file of files) {
      const schema = this.parseFile(file);
      if (schema) schemas.push(schema);
    }

    if (schemas.length === 0) return [];

    const combined: DatabaseSchema = {
      name: 'drizzle',
      platform: 'drizzle',
      file: schemas.map(s => s.file).join(', '),
      tables: schemas.flatMap(s => s.tables),
      relations: schemas.flatMap(s => s.relations),
    };

    return [combined];
  }

  private parseFile(filePath: string): DatabaseSchema | null {
    try {
      const content = this.resolver.readFileSync(this.resolver.getRelativePath(filePath));

      if (!content.includes('drizzle-orm')) return null;

      const tables = this.parseTables(content);
      const relations = this.parseRelations(content);

      if (tables.length === 0) return null;

      return {
        name: 'drizzle',
        platform: 'drizzle',
        file: this.resolver.getRelativePath(filePath),
        tables,
        relations,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseTables(content: string): DBTable[] {
    const tables: DBTable[] = [];

    const tableRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"](\w+)['"],\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*(?:,\s*\([^)]*\))?\s*\)/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[2];
      const body = match[3];
      const columns = this.parseColumns(body);
      tables.push({ name: tableName, columns });
    }

    return tables;
  }

  private parseColumns(body: string): DBColumn[] {
    const columns: DBColumn[] = [];

    const columnRegex = /(\w+)\s*:\s*(?:text|integer|bigint|real|doublePrecision|boolean|timestamp|date|time|json|jsonb|uuid|binary|varchar|char|serial|bigserial)(?:\(([^)]*)\))?(?:\.(\w+))?(?:\(([^)]*)\))?/g;
    let match;

    while ((match = columnRegex.exec(body)) !== null) {
      const name = match[1];
      const typeMethod = match[0].split(':')[1]?.trim().split('(')[0]?.trim() || 'text';

      const isPrimaryKey = body.includes(`${name}`) && (body.includes('primaryKey()') || body.includes('.primaryKey()'));
      const isNullable = body.includes(`${name}`) && body.includes('.notNull()') === false;
      const isUnique = body.includes(`${name}`) && body.includes('.unique()');

      columns.push({
        name,
        type: this.mapDrizzleType(typeMethod),
        isPrimaryKey,
        isNullable,
        isUnique,
      });
    }

    return columns;
  }

  private parseRelations(content: string): DBRelation[] {
    const relations: DBRelation[] = [];

    const relRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)Relations\s*=\s*relations\((\w+),\s*\({([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)\)/g;
    let match;

    while ((match = relRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[3];

      const manyToOneRegex = /many\s*\(\s*['"](\w+)['"]\s*,\s*\{[^}]*references\s*:\s*\[(\w+)\]/g;
      let relMatch;

      while ((relMatch = manyToOneRegex.exec(body)) !== null) {
        relations.push({
          from: { table: tableName, column: relMatch[2] },
          to: { table: relMatch[1], column: 'id' },
          type: 'many-to-one',
        });
      }
    }

    return relations;
  }

  private mapDrizzleType(type: string): string {
    const typeMap: Record<string, string> = {
      'text': 'text',
      'varchar': 'text',
      'char': 'text',
      'integer': 'integer',
      'int': 'integer',
      'bigint': 'bigint',
      'serial': 'integer',
      'bigserial': 'bigint',
      'real': 'float',
      'doublePrecision': 'double',
      'boolean': 'boolean',
      'timestamp': 'timestamp',
      'date': 'date',
      'time': 'time',
      'json': 'json',
      'jsonb': 'jsonb',
      'uuid': 'uuid',
      'binary': 'binary',
    };
    return typeMap[type] || 'text';
  }
}
