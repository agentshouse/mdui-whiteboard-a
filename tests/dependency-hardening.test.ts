import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import test from 'node:test'

test('nanoid keeps the reviewed patched 3.x production pin', () => {
  const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  assert.equal(lock.packages[''].dependencies.nanoid, '3.3.8')
  for (const [name, entry] of Object.entries(lock.packages) as [string, { version: string }][]) {
    if (name.endsWith('/nanoid')) {
      const [major, minor, patch] = entry.version.split('.').map(Number)
      assert(major === 3 && (minor > 3 || (minor === 3 && patch >= 8)), `Unreviewed nanoid: ${entry.version}`)
    }
  }
})

test('nanoid Node, browser, and non-secure entry points terminate on fractional sizes', () => {
  // A child timeout turns the former browser/non-secure infinite loop into a
  // bounded regression failure, instead of hanging the entire test process.
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { nanoid as nodeId } from 'nanoid';
    import { nanoid as browserId } from './node_modules/nanoid/index.browser.js';
    import { nanoid as nonSecureId } from 'nanoid/non-secure';
    for (const id of [nodeId, browserId, nonSecureId]) {
      assert.equal(id(4.5).length, 4);
      assert.equal(id().length, 21);
      assert.equal(id(40).length, 40);
      assert.match(id(40), /^[A-Za-z0-9_-]{40}$/);
    }
  `], { cwd: new URL('..', import.meta.url), timeout: 5000 })
})
