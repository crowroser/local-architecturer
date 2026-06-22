import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PythonParser } from '../src/parsers/python-parser.js';
import { PathResolver } from '../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('PythonParser', () => {
  let parser: PythonParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'python-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new PythonParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should parse requirements.txt', async () => {
    await fs.writeFile(path.join(tempDir, 'requirements.txt'), `
flask==2.3.0
requests>=2.28.0
numpy
pandas[excel]>=1.5.0
`);

    const result = parser.parseRequirements('requirements.txt');
    expect(result).not.toBeNull();
    expect(result!.packages).toHaveLength(4);
    expect(result!.packages[0].name).toBe('flask');
    expect(result!.packages[0].version).toBe('2.3.0');
    expect(result!.packages[2].name).toBe('numpy');
  });

  it('should skip comments in requirements.txt', async () => {
    await fs.writeFile(path.join(tempDir, 'requirements.txt'), `
# This is a comment
flask==2.3.0
# Another comment
requests>=2.28.0
`);

    const result = parser.parseRequirements('requirements.txt');
    expect(result!.packages).toHaveLength(2);
  });

  it('should parse pyproject.toml', async () => {
    await fs.writeFile(path.join(tempDir, 'pyproject.toml'), `
[project]
name = "my-project"
version = "1.0.0"
description = "A Python project"
dependencies = [
    "flask>=2.0",
    "requests>=2.28",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "black>=23.0",
]
`);

    const result = parser.parsePyprojectToml('pyproject.toml');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('my-project');
    expect(result!.version).toBe('1.0.0');
    expect(result!.dependencies).toContain('flask');
    expect(result!.dependencies).toContain('requests');
    expect(result!.optionalDependencies.dev).toContain('pytest');
  });

  it('should parse Poetry pyproject.toml', async () => {
    await fs.writeFile(path.join(tempDir, 'pyproject.toml'), `
[tool.poetry]
name = "my-poetry-project"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.9"
django = "^4.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.0"
`);

    const result = parser.parsePyprojectToml('pyproject.toml');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('my-poetry-project');
    expect(result!.dependencies).toContain('django');
    expect(result!.dependencies).not.toContain('python');
    expect(result!.devDependencies).toContain('pytest');
  });

  it('should return null for non-existent file', () => {
    const result = parser.parseRequirements('nonexistent.txt');
    expect(result).toBeNull();
  });

  it('should parse all Python files', async () => {
    await fs.mkdir(path.join(tempDir, 'apps'));
    await fs.mkdir(path.join(tempDir, 'apps', 'ml'));
    
    await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0');
    await fs.writeFile(path.join(tempDir, 'apps', 'ml', 'requirements.txt'), 'numpy==1.24');

    const packages = parser.parseAll();
    expect(packages).toHaveLength(2);
  });
});
