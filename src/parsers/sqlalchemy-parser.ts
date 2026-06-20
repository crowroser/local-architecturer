import fs from 'node:fs';
import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseSchema, DBTable, DBColumn, DBRelation } from '../types/database.js';

export class SQLAlchemyParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[SQLAlchemyParser] ');
  }

  parseAll(): DatabaseSchema[] {
    const schemas: DatabaseSchema[] = [];
    const files = this.findSQLAlchemyFiles();

    for (const file of files) {
      const schema = this.parseFile(file);
      if (schema) schemas.push(schema);
    }

    return schemas;
  }

  private findSQLAlchemyFiles(): string[] {
    const patterns = [
      '**/models/**/*.py',
      '**/src/models/**/*.py',
      '**/app/models/**/*.py',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const found = this.resolver.findFilesSync(pattern);
      files.push(...found.filter(f => !f.includes('node_modules')));
    }

    return files;
  }

  private parseFile(filePath: string): DatabaseSchema | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = this.resolver.getRelativePath(filePath);

      if (!this.isSQLAlchemyModel(content)) return null;

      const tables = this.extractTables(content);
      const relations = this.extractRelations(content);

      if (tables.length === 0) return null;

      return {
        name: path.basename(filePath, '.py'),
        platform: 'sqlalchemy',
        file: relativePath,
        tables,
        relations,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private isSQLAlchemyModel(content: string): boolean {
    return content.includes('sqlalchemy') || 
           content.includes('Column(') || 
           content.includes('declarative_base') ||
           content.includes('mapped_column');
  }

  private extractTables(content: string): DBTable[] {
    const tables: DBTable[] = [];

    const classPattern = /class\s+(\w+)\([^)]*Base[^)]*\):([\s\S]*?)(?=class\s|$)/g;
    let match;

    while ((match = classPattern.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const columns = this.extractColumns(body);
      const tableOverride = this.extractTableName(body);

      if (columns.length > 0) {
        tables.push({ name: tableOverride || tableName, columns });
      }
    }

    return tables;
  }

  private extractTableName(body: string): string | null {
    const pattern = /__tablename__\s*=\s*['"](\w+)['"]/;
    const match = body.match(pattern);
    return match?.[1] || null;
  }

  private extractColumns(body: string): DBColumn[] {
    const columns: DBColumn[] = [];

    const columnPattern = /(\w+)\s*=\s*(?:mapped_)?Column\(([^)]*)\)/g;
    let match;

    while ((match = columnPattern.exec(body)) !== null) {
      const name = match[1];
      const args = match[2];

      if (name === '__tablename__' || name.startsWith('_')) continue;

      const typeMatch = args.match(/(\w+(?:\(\d+\))?)/);
      const type = typeMatch?.[1] || 'String';

      columns.push({
        name,
        type,
        isPrimaryKey: args.includes('primary_key=True'),
        isNullable: !args.includes('nullable=False'),
        isUnique: args.includes('unique=True'),
      });
    }

    return columns;
  }

  private extractRelations(content: string): DBRelation[] {
    const relations: DBRelation[] = [];

    const relationshipPattern = /(\w+)\s*=\s*relationship\(['"](\w+)['"](?:,\s*backref=['"](\w+)['"])?(?:,\s*foreign_keys=\[[^\]]*['"](\w+)['"]\])?\)/g;
    let match;

    while ((match = relationshipPattern.exec(content)) !== null) {
      relations.push({
        from: { table: match[1], column: match[4] || `${match[2].toLowerCase()}_id` },
        to: { table: match[2], column: 'id' },
        type: 'one-to-many',
      });
    }

    return relations;
  }
}
