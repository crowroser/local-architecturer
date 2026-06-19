import fs from 'node:fs';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseSchema, DBTable, DBColumn, DBRelation } from '../types/database.js';

export class LaravelMigrationParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[LaravelMigrationParser] ');
  }

  async parseAll(): Promise<DatabaseSchema[]> {
    const migrationDirs = this.resolver.findFilesSync('**/migrations/*.php');
    if (migrationDirs.length === 0) return [];

    const tables = new Map<string, DBTable>();
    const relations: DBRelation[] = [];

    for (const file of migrationDirs) {
      this.parseMigrationFile(file, tables, relations);
    }

    if (tables.size === 0) return [];

    return [{
      name: 'laravel',
      platform: 'laravel',
      file: 'database/migrations',
      tables: Array.from(tables.values()),
      relations,
    }];
  }

  private parseMigrationFile(
    filePath: string,
    tables: Map<string, DBTable>,
    relations: DBRelation[]
  ): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      const createMatch = content.match(/Schema::create\(['"](\w+)['"]/);
      const dropMatch = content.match(/Schema::table\(['"](\w+)['"]/);
      const tableName = createMatch?.[1] || dropMatch?.[1];

      if (!tableName) return;

      if (createMatch) {
        const columns = this.parseColumns(content);
        tables.set(tableName, { name: tableName, columns });
      }

      const foreignKeys = this.parseForeignKeys(content, tableName);
      relations.push(...foreignKeys);
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
    }
  }

  private parseColumns(content: string): DBColumn[] {
    const columns: DBColumn[] = [];
    const columnRegex = /\$table->(\w+)\(['"]?(\w+)['"]?(?:,\s*['"]?([^'")\s]+)['"]?)?\)/g;
    let match;

    while ((match = columnRegex.exec(content)) !== null) {
      const method = match[1];
      const name = match[2];
      const extra = match[3];

      if (['foreign', 'index', 'unique', 'primary'].includes(method)) continue;

      const isPrimaryKey = method === 'id' || name === 'id';
      const isNullable = content.includes(`$table->${method}('${name}')->nullable()`);
      const isUnique = content.includes(`$table->${method}('${name}')->unique()`);

      columns.push({
        name,
        type: this.mapLaravelType(method),
        isPrimaryKey,
        isNullable,
        isUnique,
        defaultValue: extra || undefined,
      });
    }

    if (content.includes('$table->timestamps()')) {
      columns.push({ name: 'created_at', type: 'timestamp', isPrimaryKey: false, isNullable: true, isUnique: false });
      columns.push({ name: 'updated_at', type: 'timestamp', isPrimaryKey: false, isNullable: true, isUnique: false });
    }

    if (content.includes('$table->softDeletes()')) {
      columns.push({ name: 'deleted_at', type: 'timestamp', isPrimaryKey: false, isNullable: true, isUnique: false });
    }

    return columns;
  }

  private parseForeignKeys(content: string, tableName: string): DBRelation[] {
    const relations: DBRelation[] = [];
    const fkRegex = /\$table->foreign\(['"](\w+)['"]\)->references\(['"](\w+)['"]\)->on\(['"](\w+)['"]\)/g;
    let match;

    while ((match = fkRegex.exec(content)) !== null) {
      relations.push({
        from: { table: tableName, column: match[1] },
        to: { table: match[3], column: match[2] },
        type: 'many-to-one',
      });
    }

    const foreignIdRegex = /\$table->foreignId\(['"](\w+)['"]\)(?:->constrained\(['"]?(\w+)['"]?\))?/g;
    while ((match = foreignIdRegex.exec(content)) !== null) {
      const column = match[1];
      const referencedTable = match[2] || column.replace('_id', '');

      relations.push({
        from: { table: tableName, column },
        to: { table: referencedTable, column: 'id' },
        type: 'many-to-one',
      });
    }

    return relations;
  }

  private mapLaravelType(method: string): string {
    const typeMap: Record<string, string> = {
      'id': 'bigint',
      'bigIncrements': 'bigint',
      'increments': 'integer',
      'string': 'text',
      'text': 'text',
      'longText': 'text',
      'integer': 'integer',
      'bigInteger': 'bigint',
      'smallInteger': 'smallint',
      'tinyInteger': 'tinyint',
      'float': 'float',
      'double': 'double',
      'decimal': 'decimal',
      'boolean': 'boolean',
      'date': 'date',
      'dateTime': 'timestamp',
      'timestamp': 'timestamp',
      'time': 'time',
      'json': 'json',
      'jsonb': 'jsonb',
      'binary': 'binary',
      'uuid': 'uuid',
      'morphs': 'json',
    };
    return typeMap[method] || 'text';
  }
}
