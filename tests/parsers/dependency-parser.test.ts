import { describe, it, expect } from 'vitest';
import { DependencyParser } from '../../src/parsers/dependency-parser.js';
import type { ParsedPackage } from '../../src/parsers/package-parser.js';

describe('DependencyParser', () => {
  it('should create edges for internal dependencies', () => {
    const packageNames = ['@app/core', '@app/ui'];
    const parser = new DependencyParser(packageNames);

    const pkg: ParsedPackage = {
      name: '@app/ui',
      version: '1.0.0',
      path: 'packages/ui/package.json',
      dependencies: { '@app/core': 'workspace:*' },
      devDependencies: {},
    };

    const edges = parser.parseDependencies(pkg);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('@app/ui');
    expect(edges[0].target).toBe('@app/core');
    expect(edges[0].type).toBe('depends');
  });

  it('should not create edges for external dependencies', () => {
    const packageNames = ['@app/core', '@app/ui'];
    const parser = new DependencyParser(packageNames);

    const pkg: ParsedPackage = {
      name: '@app/ui',
      version: '1.0.0',
      path: 'packages/ui/package.json',
      dependencies: { lodash: '^4.17.0' },
      devDependencies: {},
    };

    const edges = parser.parseDependencies(pkg);
    expect(edges).toHaveLength(0);
  });

  it('should handle workspace: protocol', () => {
    const packageNames = ['@app/core', '@app/ui', '@app/utils'];
    const parser = new DependencyParser(packageNames);

    const pkg: ParsedPackage = {
      name: '@app/ui',
      version: '1.0.0',
      path: 'packages/ui/package.json',
      dependencies: {
        '@app/core': 'workspace:*',
        '@app/utils': 'workspace:^',
      },
      devDependencies: {},
    };

    const edges = parser.parseDependencies(pkg);
    expect(edges).toHaveLength(2);
    expect(edges.map(e => e.target)).toContain('@app/core');
    expect(edges.map(e => e.target)).toContain('@app/utils');
  });

  it('should handle devDependencies', () => {
    const packageNames = ['@app/core', '@app/ui'];
    const parser = new DependencyParser(packageNames);

    const pkg: ParsedPackage = {
      name: '@app/ui',
      version: '1.0.0',
      path: 'packages/ui/package.json',
      dependencies: {},
      devDependencies: { '@app/core': 'workspace:*' },
    };

    const edges = parser.parseDependencies(pkg);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('@app/ui');
    expect(edges[0].target).toBe('@app/core');
  });

  it('should handle mixed internal and external dependencies', () => {
    const packageNames = ['@app/core', '@app/ui'];
    const parser = new DependencyParser(packageNames);

    const pkg: ParsedPackage = {
      name: '@app/ui',
      version: '1.0.0',
      path: 'packages/ui/package.json',
      dependencies: {
        '@app/core': 'workspace:*',
        react: '^18.0.0',
        lodash: '^4.17.0',
      },
      devDependencies: {
        '@app/core': 'workspace:^',
        typescript: '^5.0.0',
      },
    };

    const edges = parser.parseDependencies(pkg);
    expect(edges).toHaveLength(2);
    expect(edges.every(e => e.source === '@app/ui')).toBe(true);
    expect(edges.every(e => e.target === '@app/core')).toBe(true);
  });
});
