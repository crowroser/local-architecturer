import fs from 'node:fs';
import path from 'node:path';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseSchema, DBTable, DBColumn, DBRelation } from '../types/database.js';

export class SequelizeParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[SequelizeParser] ');
  }

  parseAll(): DatabaseSchema[] {
    const schemas: DatabaseSchema[] = [];
    const files = this.findSequelizeFiles();

    for (const file of files) {
      const schema = this.parseFile(file);
      if (schema) schemas.push(schema);
    }

    return schemas;
  }

  private findSequelizeFiles(): string[] {
    const patterns = [
      '**/models/**/*.js',
      '**/models/**/*.ts',
      '**/src/models/**/*.js',
      '**/src/models/**/*.ts',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const found = this.resolver.findFilesSync(pattern);
      files.push(...found.filter(f => 
        !f.includes('.d.ts') && !f.includes('node_modules')
      ));
    }

    return files;
  }

  private parseFile(filePath: string): DatabaseSchema | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = this.resolver.getRelativePath(filePath);

      if (!this.isSequelizeModel(content)) return null;

      const tables = this.extractTables(content);
      const relations = this.extractRelations(content);

      if (tables.length === 0) return null;

      return {
        name: path.basename(filePath, path.extname(filePath)),
        platform: 'sequelize',
        file: relativePath,
        tables,
        relations,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private isSequelizeModel(content: string): boolean {
    return content.includes('sequelize') || 
           content.includes('DataTypes') || 
           content.includes('Model.init(') ||
           content.includes('define(');
  }

  private extractTables(content: string): DBTable[] {
    const tables: DBTable[] = [];

    const initPattern = /(\w+)\.init\(\{([\s\S]*?)\}/g;
    let match;

    while ((match = initPattern.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const columns = this.extractColumns(body);
      
      if (columns.length > 0) {
        tables.push({ name: tableName, columns });
      }
    }

    const definePattern = /\.define\(['"](\w+)['"],\s*\{([\s\S]*?)\}/g;
    while ((match = definePattern.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const columns = this.extractColumns(body);
      
      if (columns.length > 0 && !tables.some(t => t.name === tableName)) {
        tables.push({ name: tableName, columns });
      }
    }

    return tables;
  }

  private extractColumns(body: string): DBColumn[] {
    const columns: DBColumn[] = [];
    const columnPattern = /(\w+):\s*(?:DataTypes\.)?(\w+)/g;
    let match;

    while ((match = columnPattern.exec(body)) !== null) {
      const name = match[1];
      const type = match[2];

      if (['sequelize', 'options', 'tableName', 'timestamps'].includes(name)) continue;

      columns.push({
        name,
        type,
        isPrimaryKey: body.includes(`${name}:`) && body.includes('primaryKey: true'),
        isNullable: !body.includes(`${name}:`) || !body.includes('allowNull: false'),
        isUnique: body.includes('unique: true'),
      });
    }

    return columns;
  }

  private extractRelations(content: string): DBRelation[] {
    const relations: DBRelation[] = [];

    const belongsToPattern = /(\w+)\.belongsTo\((\w+)(?:,\s*\{[^}]*foreignKey:\s*['"](\w+)['"]\})?\)/g;
    let match;

    while ((match = belongsToPattern.exec(content)) !== null) {
      relations.push({
        from: { table: match[1], column: match[3] || `${match[2].toLowerCase()}Id` },
        to: { table: match[2], column: 'id' },
        type: 'many-to-one',
      });
    }

    const hasManyPattern = /(\w+)\.hasMany\((\w+)(?:,\s*\{[^}]*foreignKey:\s*['"](\w+)['"]\})?\)/g;
    while ((match = hasManyPattern.exec(content)) !== null) {
      relations.push({
        from: { table: match[1], column: 'id' },
        to: { table: match[2], column: match[3] || `${match[1].toLowerCase()}Id` },
        type: 'one-to-many',
      });
    }

    return relations;
  }
}
