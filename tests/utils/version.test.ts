import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getVersion } from '../../src/utils/version.js';

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

describe('getVersion', () => {
  it('should return a version string', () => {
    const version = getVersion();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should return consistent version on multiple calls', () => {
    const v1 = getVersion();
    const v2 = getVersion();
    expect(v1).toBe(v2);
  });

  it('should return the version from package.json', () => {
    const version = getVersion();
    expect(version).toBe(pkg.version);
  });
});
