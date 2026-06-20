import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaParser } from '../../src/parsers/prisma-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('PrismaParser', () => {
  let parser: PrismaParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prisma-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new PrismaParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no schema.prisma exists', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse Prisma schema with models', async () => {
    await fs.writeFile(
      path.join(tempDir, 'schema.prisma'),
      `datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model User {
        id    Int    @id @default(autoincrement())
        email String @unique
        name  String?
        posts Post[]
      }

      model Post {
        id        Int    @id @default(autoincrement())
        title     String
        content   String?
        authorId  Int
        author    User   @relation(fields: [authorId], references: [id])
      }`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('prisma');
    expect(result[0].tables.length).toBe(2);
    
    const userTable = result[0].tables.find(t => t.name === 'User');
    expect(userTable).toBeDefined();
    expect(userTable!.columns.length).toBe(4);
    
    const idColumn = userTable!.columns.find(c => c.name === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.isPrimaryKey).toBe(true);
    
    const emailColumn = userTable!.columns.find(c => c.name === 'email');
    expect(emailColumn).toBeDefined();
    expect(emailColumn!.isUnique).toBe(true);
    
    const nameColumn = userTable!.columns.find(c => c.name === 'name');
    expect(nameColumn).toBeDefined();
    expect(nameColumn!.isNullable).toBe(true);
  });

  it('should parse relations correctly', async () => {
    await fs.writeFile(
      path.join(tempDir, 'schema.prisma'),
      `model User {
        id    Int    @id @default(autoincrement())
        posts Post[]
      }

      model Post {
        id       Int  @id @default(autoincrement())
        authorId Int
        author   User @relation(fields: [authorId], references: [id])
      }`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].relations.length).toBe(1);
    expect(result[0].relations[0].from.table).toBe('Post');
    expect(result[0].relations[0].to.table).toBe('User');
  });

  it('should map Prisma types correctly', async () => {
    await fs.writeFile(
      path.join(tempDir, 'schema.prisma'),
      `model Test {
        id        Int      @id @default(autoincrement())
        name      String
        price     Float
        active    Boolean
        createdAt DateTime
        metadata  Json
        amount    Decimal
      }`
    );

    const result = await parser.parseAll();
    const testTable = result[0].tables.find(t => t.name === 'Test');
    expect(testTable).toBeDefined();
    
    const idCol = testTable!.columns.find(c => c.name === 'id');
    expect(idCol!.type).toBe('integer');
    
    const nameCol = testTable!.columns.find(c => c.name === 'name');
    expect(nameCol!.type).toBe('text');
    
    const priceCol = testTable!.columns.find(c => c.name === 'price');
    expect(priceCol!.type).toBe('float');
    
    const activeCol = testTable!.columns.find(c => c.name === 'active');
    expect(activeCol!.type).toBe('boolean');
  });
});
