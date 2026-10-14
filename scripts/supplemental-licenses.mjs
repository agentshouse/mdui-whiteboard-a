import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function loadSupplementalLicenses(root) {
  const directory = path.join(root, 'licenses/supplemental');
  const licenses = new Map();
  if (!fs.existsSync(directory)) return licenses;
  for (const family of fs.readdirSync(directory).sort()) {
    const manifest = path.join(directory, family, 'provenance.json');
    if (!fs.existsSync(manifest)) continue;
    for (const record of JSON.parse(fs.readFileSync(manifest, 'utf8'))) {
      const key = `${record.name}@${record.version}`;
      assert(!licenses.has(key), `Duplicate recovered notice: ${key}`);
      assert(/^[a-f0-9]{40}$/.test(record.commit), `Source commit is not pinned: ${key}`);
      assert(record.sourceUrl.includes(record.commit), `Source URL is not immutable: ${key}`);
      assert(record.verification?.trim(), `Missing recovery evidence: ${key}`);
      const file = path.resolve(root, record.licenseFile);
      assert(file.startsWith(directory + path.sep), `License file escapes source notice directory: ${key}`);
      const text = fs.readFileSync(file, 'utf8');
      assert(text.length > 500 && text.includes('Copyright'), `Incomplete recovered notice: ${key}`);
      assert.equal(createHash('sha256').update(text).digest('hex'), record.sha256, `Recovered notice changed: ${key}`);
      if (record.basis === 'spdx-declaration') {
        assert.equal(key, 'use-composed-ref@1.4.0', `Unreviewed declaration-only notice: ${key}`);
        assert.equal(record.declaredLicense, 'MIT');
        const sourceBytes = fs.readFileSync(path.join(root, record.sourceManifestFile));
        assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), record.sourceManifestSha256);
        const source = JSON.parse(sourceBytes);
        const installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', record.name, 'package.json'), 'utf8'));
        for (const manifest of [source, installed]) {
          assert.equal(manifest.name, record.name);
          assert.equal(manifest.version, record.version);
          assert.equal(manifest.license, record.declaredLicense);
          assert.deepEqual(manifest.author ?? null, record.declaredAuthor);
        }
        assert.equal(record.copyrightHolder, null);
        assert.equal(record.licenseTextCommit, 'c4a7237ec8f4654e867546f9f409749300f1bf4c');
        assert.equal(record.licenseTextSourceUrl, `https://github.com/spdx/license-list-data/blob/${record.licenseTextCommit}/text/MIT.txt`);
        assert.equal(record.sha256, 'b05785f9f18e6716bab63424b11454513b9943a222595b70411009202fc592b5');
        assert(text.includes('Copyright (c) <year> <copyright holders>'));
      }
      if (record.artifactComparison) {
        const proof = JSON.parse(fs.readFileSync(path.join(root, record.artifactComparison), 'utf8'));
        const packageDirectory = path.join(root, 'node_modules', record.name);
        for (const item of proof.matches) {
          const installed = fs.readFileSync(path.join(packageDirectory, item.path));
          assert.equal(createHash('sha256').update(installed).digest('hex'), item.sha256, `Equivalent-source evidence no longer matches installed file: ${key}/${item.path}`);
        }
        assert.deepEqual(proof.differences, ['package.json'], `Equivalence contains unreviewed source differences: ${key}`);
      }
      licenses.set(key, { ...record, text });
    }
  }
  return licenses;
}
