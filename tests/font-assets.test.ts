import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { restoreFonts } from '../scripts/prepare-fonts.mjs';

test('restores exact font bytes and rejects a changed asset before writing any output', () => {
  const root = mkdtempSync(join(tmpdir(), 'house-font-assets-'));
  try {
    const source = join(root, 'source'), destination = join(root, 'output');
    mkdirSync(source);
    const bytes = Buffer.from('font fixture');
    const hash = createHash('sha256').update(bytes).digest('hex');
    writeFileSync(join(source, 'one.woff2'), bytes);
    assert.equal(restoreFonts(source, destination, { 'one.woff2': hash }), 1);
    assert.deepEqual(readFileSync(join(destination, 'one.woff2')), bytes);
    writeFileSync(join(source, 'two.woff2'), 'changed');
    assert.throws(() => restoreFonts(source, join(root, 'rejected'), { 'one.woff2': hash, 'two.woff2': hash }), /Font differs/);
    assert.equal(existsSync(join(root, 'rejected')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
