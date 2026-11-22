// Node module hooks so `node --test` can run the app's TypeScript lib code directly:
//  - "@/x"          → src/x(.ts)          (tsconfig path alias)
//  - "./x"          → ./x.ts              (extensionless relative imports)
//  - lib/catalog    → tests/unit/stubs/catalog.ts (the real one needs React Native stores)
import { existsSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..');
const stubs = { [join(root, 'src', 'lib', 'catalog')]: join(root, 'tests', 'unit', 'stubs', 'catalog.ts') };

function withExtension(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (stubs[candidate.replace(/\.tsx?$/, '')]) return stubs[candidate.replace(/\.tsx?$/, '')];
    if (existsSync(candidate) && /\.(m?js|tsx?)$/.test(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('@/')) base = join(root, 'src', specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const file = withExtension(base);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return next(specifier, context);
}
