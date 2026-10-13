import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadSupplementalLicenses } from '../scripts/supplemental-licenses.mjs';

function fixture(check: (root: string, manifest: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'declared-license-'));
  try {
    const source = resolve(import.meta.dirname, '../licenses/supplemental/use-composed-ref');
    const target = join(root, 'licenses/supplemental/use-composed-ref');
    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true });
    const installed = join(root, 'node_modules/use-composed-ref');
    mkdirSync(installed, { recursive: true });
    cpSync(resolve(import.meta.dirname, '../node_modules/use-composed-ref/package.json'), join(installed, 'package.json'));
    check(root, join(target, 'provenance.json'));
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('retains standard SPDX bytes and an explicitly unknown author instead of inventing a copyright notice', () => fixture(root => {
  const record = loadSupplementalLicenses(root).get('use-composed-ref@1.4.0');
  assert.equal(record.basis, 'spdx-declaration');
  assert.equal(record.declaredAuthor, null);
  assert.equal(record.copyrightHolder, null);
  assert.match(record.text, /Copyright \(c\) <year> <copyright holders>/);
}));

test('rejects a changed standard license text', () => fixture(root => {
  writeFileSync(join(root, 'licenses/supplemental/use-composed-ref/LICENSE.txt'), 'Copyright invented');
  assert.throws(() => loadSupplementalLicenses(root), /Incomplete recovered notice/);
}));

test('does not extend the declaration exception to another package', () => fixture((root, manifest) => {
  const records = JSON.parse(readFileSync(manifest, 'utf8'));
  records[0].name = 'another-package';
  writeFileSync(manifest, JSON.stringify(records));
  assert.throws(() => loadSupplementalLicenses(root), /Unreviewed declaration-only notice/);
}));

test('rejects a package without the pinned declared license', () => fixture(root => {
  const file = join(root, 'node_modules/use-composed-ref/package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  delete pkg.license;
  writeFileSync(file, JSON.stringify(pkg));
  assert.throws(() => loadSupplementalLicenses(root), /MIT/);
}));
