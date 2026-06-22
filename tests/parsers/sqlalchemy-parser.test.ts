import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLAlchemyParser } from '../../src/parsers/sqlalchemy-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('SQLAlchemyParser', () => {
  let parser: SQLAlchemyParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sqlalchemy-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new SQLAlchemyParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when no model files exist', () => {
    const result = parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should parse valid SQLAlchemy models', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'user.py'),
      `from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)

    posts = relationship('Post', backref='author')

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True)
    title = Column(String)
    body = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))
`
    );

    const result = parser.parseAll();
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe('sqlalchemy');
    expect(result[0].tables.length).toBe(2);

    const usersTable = result[0].tables.find(t => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable!.columns.length).toBe(3);

    const idCol = usersTable!.columns.find(c => c.name === 'id');
    expect(idCol).toBeDefined();
    expect(idCol!.isPrimaryKey).toBe(true);

    const emailCol = usersTable!.columns.find(c => c.name === 'email');
    expect(emailCol).toBeDefined();
    expect(emailCol!.isUnique).toBe(true);

    const postsTable = result[0].tables.find(t => t.name === 'posts');
    expect(postsTable).toBeDefined();
    expect(postsTable!.columns.length).toBe(4);
  });

  it('should parse files in src/models/ directory', async () => {
    await fs.mkdir(path.join(tempDir, 'src', 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'src', 'models', 'product.py'),
      `from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Product(Base):
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True)
    name = Column(String)
`
    );

    const result = parser.parseAll();
    expect(result.length).toBeGreaterThanOrEqual(1);
    const productTable = result.flatMap(s => s.tables).find(t => t.name === 'products');
    expect(productTable).toBeDefined();
  });

  it('should parse files in app/models/ directory', async () => {
    await fs.mkdir(path.join(tempDir, 'app', 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'app', 'models', 'order.py'),
      `from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Order(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True)
    status = Column(String)
`
    );

    const result = parser.parseAll();
    expect(result.length).toBeGreaterThanOrEqual(1);
    const orderTable = result.flatMap(s => s.tables).find(t => t.name === 'orders');
    expect(orderTable).toBeDefined();
  });

  it('should skip non-SQLAlchemy model files', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'helper.py'),
      `def helper_function():
    return "not a model"
`
    );

    const result = parser.parseAll();
    expect(result).toEqual([]);
  });

  it('should extract relationships', async () => {
    await fs.mkdir(path.join(tempDir, 'models'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'models', 'models.py'),
      `from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Author(Base):
    __tablename__ = 'authors'

    id = Column(Integer, primary_key=True)
    books = relationship('Book', backref='author')

class Book(Base):
    __tablename__ = 'books'

    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey('authors.id'))
`
    );

    const result = parser.parseAll();
    expect(result[0].relations.length).toBeGreaterThanOrEqual(1);
  });
});
