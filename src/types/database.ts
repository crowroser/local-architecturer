export interface DatabaseSchema {
  name: string;
  platform: 'prisma' | 'laravel' | 'typeorm' | 'drizzle' | 'sequelize' | 'sqlalchemy';
  file: string;
  tables: DBTable[];
  relations: DBRelation[];
}

export interface DBTable {
  name: string;
  columns: DBColumn[];
}

export interface DBColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  references?: { table: string; column: string };
}

export interface DBRelation {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one';
}
