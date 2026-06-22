import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DrizzleParser } from '../../src/parsers/drizzle-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('DrizzleParser', () => {
  let parser: DrizzleParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drizzle-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new DrizzleParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no schema files exist', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid Drizzle schema with tables', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'schema.ts'),
      `import { pgTable, text, integer, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age'),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: uuid('author_id'),
});
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('drizzle');
    expect(result[0].name).toBe('drizzle');
    expect(result[0].tables.length).toBe(2);

    const usersTable = result[0].tables.find(t => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable!.columns.length).toBe(4);

    const idCol = usersTable!.columns.find(c => c.name === 'id');
    expect(idCol).toBeDefined();
    expect(idCol!.type).toBe('uuid');

    const nameCol = usersTable!.columns.find(c => c.name === 'name');
    expect(nameCol).toBeDefined();
    expect(nameCol!.type).toBe('text');

    const postsTable = result[0].tables.find(t => t.name === 'posts');
    expect(postsTable).toBeDefined();
    expect(postsTable!.columns.length).toBe(4);
  });

  it('should parse mysqlTable', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'schema.ts'),
      `import { mysqlTable, varchar, int } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey(),
  name: varchar('name', { length: 100 }),
});
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].tables.length).toBe(1);
    expect(result[0].tables[0].name).toBe('users');
  });

  it('should parse sqliteTable', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'schema.ts'),
      `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
});
`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].tables.length).toBe(1);
  });

  it('should skip files without drizzle-orm import', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'schema.ts'),
      `export const x = 1;
`
    );

    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should map drizzle types correctly', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'schema.ts'),
      `import { pgTable, text, integer, bigint, boolean, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const data = pgTable('data', {
  t: text('t'),
  i: integer('i'),
  b: bigint('b'),
  bl: boolean('bl'),
  ts: timestamp('ts'),
  u: uuid('u'),
  vc: varchar('vc'),
});
`
    );

    const result = await parser.parseAll();
    const table = result[0].tables.find(t => t.name === 'data');
    expect(table).toBeDefined();
    expect(table!.columns.length).toBe(7);

    expect(table!.columns.find(c => c.name === 't')!.type).toBe('text');
    expect(table!.columns.find(c => c.name === 'i')!.type).toBe('integer');
    expect(table!.columns.find(c => c.name === 'b')!.type).toBe('bigint');
    expect(table!.columns.find(c => c.name === 'bl')!.type).toBe('boolean');
    expect(table!.columns.find(c => c.name === 'ts')!.type).toBe('timestamp');
    expect(table!.columns.find(c => c.name === 'u')!.type).toBe('uuid');
    expect(table!.columns.find(c => c.name === 'vc')!.type).toBe('text');
  });
});
