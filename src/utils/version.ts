import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedVersion: string | null = null;

export function getVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pkgPath = path.join(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    cachedVersion = pkg.version || '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion ?? '0.0.0';
}
