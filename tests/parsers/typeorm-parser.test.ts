import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TypeORMParser } from '../../src/parsers/typeorm-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('TypeORMParser', () => {
  let parser: TypeORMParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'typeorm-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new TypeORMParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no entity files exist', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid TypeORM entity files', async () => {
    await fs.mkdir(path.join(tempDir, 'entities'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'entities', 'user.entity.ts'),
      `import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('typeorm');
    expect(result[0].name).toBe('typeorm');
    expect(result[0].tables.length).toBe(1);

    const usersTable = result[0].tables.find(t => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable!.columns.length).toBeGreaterThanOrEqual(3);

    const idCol = usersTable!.columns.find(c => c.name === 'id');
    expect(idCol).toBeDefined();
    expect(idCol!.isPrimaryKey).toBe(true);
  });

  it('should map TypeORM types correctly', async () => {
    await fs.mkdir(path.join(tempDir, 'entities'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'entities', 'data.entity.ts'),
      `import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('data')
export class Data {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  count: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean' })
  flag: boolean;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'json' })
  metadata: object;
}
`
    );

    const result = await parser.parseAll();
    const dataTable = result[0].tables.find(t => t.name === 'data');
    expect(dataTable).toBeDefined();

    const idCol = dataTable!.columns.find(c => c.name === 'id');
    expect(idCol!.type).toBe('bigint');
    expect(idCol!.isPrimaryKey).toBe(true);

    const countCol = dataTable!.columns.find(c => c.name === 'count');
    expect(countCol!.type).toBe('integer');

    const descCol = dataTable!.columns.find(c => c.name === 'description');
    expect(descCol!.type).toBe('text');

    const flagCol = dataTable!.columns.find(c => c.name === 'flag');
    expect(flagCol!.type).toBe('boolean');

    const dateCol = dataTable!.columns.find(c => c.name === 'createdAt');
    expect(dateCol!.type).toBe('timestamp');

    const jsonCol = dataTable!.columns.find(c => c.name === 'metadata');
    expect(jsonCol!.type).toBe('json');
  });

  it('should parse ManyToOne relations', async () => {
    await fs.mkdir(path.join(tempDir, 'entities'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'entities', 'comment.entity.ts'),
      `import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('text')
  body: string;

  @ManyToOne({ type: () => Post })
  post: Post;
}
`
    );

    const result = await parser.parseAll();
    expect(result[0].relations.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle entity without @Entity decorator', async () => {
    await fs.mkdir(path.join(tempDir, 'entities'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'entities', 'helper.ts'),
      `export function helper() {
  return true;
}
`
    );

    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });
});
