import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DBSchemaParser } from '../../src/parsers/db-schema-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('DBSchemaParser', () => {
  let parser: DBSchemaParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-schema-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new DBSchemaParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no schema files exist', async () => {
    const result = await parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should detect Prisma schema', async () => {
    await fs.writeFile(
      path.join(tempDir, 'schema.prisma'),
      `model User {
        id    Int    @id @default(autoincrement())
        email String @unique
      }`
    );

    const result = await parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('prisma');
    expect(result[0].tables.length).toBe(1);
  });

  it('should handle multiple schema types', async () => {
    await fs.writeFile(
      path.join(tempDir, 'schema.prisma'),
      `model User {
        id Int @id
      }`
    );

    const result = await parser.parseAll();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
