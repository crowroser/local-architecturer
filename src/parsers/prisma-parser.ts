import fs from 'node:fs';
import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseSchema, DBTable, DBColumn, DBRelation } from '../types/database.js';

export class PrismaParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[PrismaParser] ');
  }

  async parseAll(): Promise<DatabaseSchema[]> {
    const files = this.resolver.findFilesSync('**/schema.prisma');
    const schemas: DatabaseSchema[] = [];

    for (const file of files) {
      const schema = this.parseFile(file);
      if (schema) schemas.push(schema);
    }

    return schemas;
  }

  private parseFile(filePath: string): DatabaseSchema | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const tables = this.parseModels(content);
      const relations = this.parseRelations(content);

      return {
        name: path.basename(path.dirname(filePath)) || 'database',
        platform: 'prisma',
        file: this.resolver.getRelativePath(filePath),
        tables,
        relations,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseModels(content: string): DBTable[] {
    const tables: DBTable[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const columns = this.parseFields(body);
      tables.push({ name: tableName, columns });
    }

    return tables;
  }

  private parseFields(body: string): DBColumn[] {
    const columns: DBColumn[] = [];
    const lines = body.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(.*)$/);
      if (!fieldMatch) continue;

      const name = fieldMatch[1];
      const type = fieldMatch[2];
      const attrs = fieldMatch[3] || '';

      const isPrimaryKey = attrs.includes('@id') || attrs.includes('@default(cuid())') || attrs.includes('@default(uuid())');
      const isNullable = attrs.includes('?');
      const isUnique = attrs.includes('@unique');

      const refMatch = attrs.match(/@relation\([^)]*fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]/);
      const references = refMatch ? { table: '', column: refMatch[2] } : undefined;

      columns.push({
        name,
        type: this.mapPrismaType(type),
        isPrimaryKey,
        isNullable,
        isUnique,
        references,
      });
    }

    return columns;
  }

  private parseRelations(content: string): DBRelation[] {
    const relations: DBRelation[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const relRegex = /(\w+)\s+(\w+)\s+@relation\([^)]*fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]/g;
      let relMatch;

      while ((relMatch = relRegex.exec(body)) !== null) {
        const targetType = relMatch[2];
        const fromColumn = relMatch[3];
        const toColumn = relMatch[4];

        relations.push({
          from: { table: tableName, column: fromColumn },
          to: { table: targetType, column: toColumn },
          type: 'one-to-many',
        });
      }
    }

    return relations;
  }

  private mapPrismaType(type: string): string {
    const typeMap: Record<string, string> = {
      'String': 'text',
      'Int': 'integer',
      'Float': 'float',
      'Boolean': 'boolean',
      'DateTime': 'timestamp',
      'Json': 'json',
      'BigInt': 'bigint',
      'Decimal': 'decimal',
      'Bytes': 'binary',
    };
    return typeMap[type] || type.toLowerCase();
  }
}
