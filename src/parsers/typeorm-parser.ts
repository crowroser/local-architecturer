import fs from 'node:fs';
import { PathResolver } from '../core/path-resolver.js';
import { Logger } from '../utils/logger.js';
import type { DatabaseSchema, DBColumn, DBRelation } from '../types/database.js';

export class TypeORMParser {
  private resolver: PathResolver;
  private logger: Logger;

  constructor(resolver: PathResolver) {
    this.resolver = resolver;
    this.logger = new Logger('[TypeORMParser] ');
  }

  async parseAll(): Promise<DatabaseSchema[]> {
    const files = this.resolver.findFilesSync('**/*.entity.ts');
    const schemas: DatabaseSchema[] = [];

    for (const file of files) {
      const schema = this.parseFile(file);
      if (schema) schemas.push(schema);
    }

    if (schemas.length === 0) return [];

    const combined: DatabaseSchema = {
      name: 'typeorm',
      platform: 'typeorm',
      file: schemas.map(s => s.file).join(', '),
      tables: schemas.flatMap(s => s.tables),
      relations: schemas.flatMap(s => s.relations),
    };

    return [combined];
  }

  private parseFile(filePath: string): DatabaseSchema | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      const entityMatch = content.match(/@Entity\(['"]?(\w+)['"]?\)/);
      if (!entityMatch) return null;

      const tableName = entityMatch[1];
      const columns = this.parseColumns(content);
      const relations = this.parseRelations(content, tableName);

      return {
        name: tableName,
        platform: 'typeorm',
        file: this.resolver.getRelativePath(filePath),
        tables: [{ name: tableName, columns }],
        relations,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse ${filePath}: ${error}`);
      return null;
    }
  }

  private parseColumns(content: string): DBColumn[] {
    const columns: DBColumn[] = [];

    const primaryMatch = content.match(/@PrimaryGeneratedColumn\((?:['"](\w+)['"]|\{[^}]*\})\)/);
    if (primaryMatch) {
      columns.push({
        name: 'id',
        type: 'bigint',
        isPrimaryKey: true,
        isNullable: false,
        isUnique: false,
      });
    }

    const columnRegex = /@Column\((?:\{([^}]*)\}|['"]?(\w+)['"]?)\)\s*(?:readonly\s+)?(\w+)[\s:;]/g;
    let match;

    while ((match = columnRegex.exec(content)) !== null) {
      const options = match[1] || '';
      const simpleType = match[2];
      const name = match[3];

      const typeMatch = options.match(/type:\s*['"]?(\w+)['"]?/);
      const type = typeMatch?.[1] || simpleType || 'text';

      const isNullable = options.includes('nullable: true');
      const isUnique = options.includes('unique: true');
      const hasDefault = options.match(/default:\s*(['"].*?['"]|\w+)/);
      const isPrimaryKey = content.includes(`@PrimaryColumn`) && content.indexOf(`@PrimaryColumn`) < content.indexOf(name);

      columns.push({
        name,
        type: this.mapTypeORMType(type),
        isPrimaryKey,
        isNullable,
        isUnique,
        defaultValue: hasDefault?.[1],
      });
    }

    return columns;
  }

  private parseRelations(content: string, tableName: string): DBRelation[] {
    const relations: DBRelation[] = [];

    const manyToOneRegex = /@ManyToOne\((?:\(([^)]*)\)|\{([^}]*)\})\)\s*(?:readonly\s+)?(\w+)[\s:;]/g;
    let match;

    while ((match = manyToOneRegex.exec(content)) !== null) {
      const options = match[1] || match[2] || '';
      const name = match[3];

      const typeMatch = options.match(/type:\s*\(\)\s*=>\s*(\w+)/);
      const targetTable = typeMatch?.[1]?.toLowerCase() || name.replace('Id', '');

      relations.push({
        from: { table: tableName, column: name },
        to: { table: targetTable, column: 'id' },
        type: 'many-to-one',
      });
    }

    const oneToManyRegex = /@OneToMany\((?:\(([^)]*)\)|\{([^}]*)\})\)\s*(?:readonly\s+)?(\w+)[\s:;]/g;
    while ((match = oneToManyRegex.exec(content)) !== null) {
      const options = match[1] || match[2] || '';

      const typeMatch = options.match(/type:\s*\(\)\s*=>\s*(\w+)/);
      const targetTable = typeMatch?.[1]?.toLowerCase() || '';

      if (targetTable) {
        relations.push({
          from: { table: tableName, column: 'id' },
          to: { table: targetTable, column: `${tableName}Id` },
          type: 'one-to-many',
        });
      }
    }

    return relations;
  }

  private mapTypeORMType(type: string): string {
    const typeMap: Record<string, string> = {
      'int': 'integer',
      'integer': 'integer',
      'bigint': 'bigint',
      'float': 'float',
      'double': 'double',
      'decimal': 'decimal',
      'string': 'text',
      'text': 'text',
      'boolean': 'boolean',
      'date': 'timestamp',
      'datetime': 'timestamp',
      'timestamp': 'timestamp',
      'json': 'json',
      'simple-json': 'json',
      'binary': 'binary',
      'varbinary': 'binary',
      'uuid': 'uuid',
    };
    return typeMap[type.toLowerCase()] || type.toLowerCase();
  }
}
