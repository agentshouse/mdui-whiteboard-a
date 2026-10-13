import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function restoreFonts(source, destination, hashes) {
  const checked = Object.entries(hashes).map(([name, hash]) => {
    assert.equal(path.basename(name), name, 'Font asset must be a filename');
    const bytes = fs.readFileSync(path.join(source, name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, `Font differs from the retained donor asset: ${name}`);
    return [name, bytes];
  });
  fs.mkdirSync(destination, { recursive: true });
  for (const [name, bytes] of checked) fs.writeFileSync(path.join(destination, name), bytes);
  return checked.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(import.meta.dirname, '..');
  const donor = path.join(root, 'node_modules/@excalidraw/excalidraw');
  const pkg = JSON.parse(fs.readFileSync(path.join(donor, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.18.0');
  const hashes = JSON.parse(fs.readFileSync(path.join(root, 'scripts/xiaolai-assets.json'), 'utf8'));
  const count = restoreFonts(path.join(donor, 'dist/prod/fonts/Xiaolai'), path.join(root, 'packages/excalidraw/fonts/Xiaolai'), hashes);
  console.log(`Restored ${count} unchanged Xiaolai font assets from the pinned donor package.`);
}
