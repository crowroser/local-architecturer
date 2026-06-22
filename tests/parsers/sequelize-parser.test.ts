import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SequelizeParser } from '../../src/parsers/sequelize-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('SequelizeParser', () => {
  let parser: SequelizeParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sequelize-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new SequelizeParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no model files exist', () => {
    const result = parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid Sequelize model with Model.init()', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'user.js'),
      `const { DataTypes } = require('sequelize');

class User extends Model {}
User.init({
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  age: DataTypes.INTEGER,
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
`
    );

    const result = parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('sequelize');
    expect(result[0].name).toBe('user');
    expect(result[0].tables.length).toBe(1);
    expect(result[0].tables[0].name).toBe('User');
    expect(result[0].tables[0].columns.length).toBe(3);
  });

  it('should parse valid Sequelize model with define()', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'post.js'),
      `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    title: DataTypes.STRING,
    body: DataTypes.TEXT,
    published: DataTypes.BOOLEAN,
  });

  return Post;
};
`
    );

    const result = parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].tables[0].name).toBe('Post');
    expect(result[0].tables[0].columns.length).toBe(3);
  });

  it('should extract belongsTo relations', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'post.js'),
      `const { DataTypes } = require('sequelize');

class Post extends Model {}
Post.init({
  title: DataTypes.STRING,
}, { sequelize, tableName: 'posts' });

Post.belongsTo(User);

module.exports = Post;
`
    );

    const result = parser.parseAll();
    expect(result[0].relations.length).toBeGreaterThanOrEqual(1);
    const rel = result[0].relations[0];
    expect(rel.type).toBe('many-to-one');
  });

  it('should extract hasMany relations', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'user.js'),
      `const { DataTypes } = require('sequelize');

class User extends Model {}
User.init({
  name: DataTypes.STRING,
}, { sequelize, tableName: 'users' });

User.hasMany(Post);

module.exports = User;
`
    );

    const result = parser.parseAll();
    const hasManyRel = result[0].relations.find(r => r.type === 'one-to-many');
    expect(hasManyRel).toBeDefined();
  });

  it('should skip non-Sequelize files', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'helper.js'),
      `function helper() {
  return true;
}
module.exports = helper;
`
    );

    const result = parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse TypeScript model files', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'user.ts'),
      `import { DataTypes, Model } from 'sequelize';

class User extends Model {}
User.init({
  name: DataTypes.STRING,
  email: DataTypes.STRING,
}, { sequelize, tableName: 'users' });

export default User;
`
    );

    const result = parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].tables[0].columns.length).toBe(2);
  });
});
