import fs from 'node:fs';
import path from 'node:path';

let cachedVersion: string | null = null;

function normalizeVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function findNearestPackageJson(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;

  const fromEnv = normalizeVersion(process.env.npm_package_version);
  if (fromEnv) {
    cachedVersion = fromEnv;
    return cachedVersion;
  }

  try {
    const packagePath = findNearestPackageJson(__dirname);
    if (packagePath) {
      const raw = fs.readFileSync(packagePath, 'utf8');
      const parsed = JSON.parse(raw) as { version?: string };
      const fromPkg = normalizeVersion(parsed.version);
      if (fromPkg) {
        cachedVersion = fromPkg;
        return cachedVersion;
      }
    }
  } catch {
    // fallback below
  }

  cachedVersion = '0.0.0';
  return cachedVersion;
}
