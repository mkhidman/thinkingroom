import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const lockPath = resolve(root, 'package-lock.json');
const npmrcPath = resolve(root, '.npmrc');

if (!existsSync(lockPath)) {
  console.error('package-lock.json tidak ditemukan.');
  process.exit(1);
}

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const nodeSupported = (nodeMajor === 20 && nodeMinor >= 19) || nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 12);
if (!nodeSupported) {
  console.error(`Node.js ${process.versions.node} belum didukung. Gunakan Node 20.19+ atau Node 22.12+.`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const invalid = [];
const internalReferences = [];
for (const [name, entry] of Object.entries(lock.packages ?? {})) {
  const resolved = entry && typeof entry === 'object' ? entry.resolved : undefined;
  if (typeof resolved === 'string' && resolved.startsWith('http') && !resolved.startsWith('https://registry.npmjs.org/')) {
    invalid.push(`${name || '(root)'} -> ${resolved}`);
  }
  if (typeof resolved === 'string' && /openai|artifactory|packages\.hub/i.test(resolved)) {
    internalReferences.push(`${name || '(root)'} -> ${resolved}`);
  }
}

if (invalid.length || internalReferences.length) {
  console.error('Ditemukan registry dependency non-publik/internal:');
  [...invalid, ...internalReferences].slice(0, 20).forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

const npmrc = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : '';
if (!npmrc.includes('registry=https://registry.npmjs.org/')) {
  console.error('.npmrc belum diarahkan ke https://registry.npmjs.org/');
  process.exit(1);
}

console.log(`Local-ready OK: Node ${process.versions.node}, npm registry publik, dan package-lock bersih.`);
