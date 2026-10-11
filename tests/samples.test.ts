import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { parseScene, serializeScene } from '../src/house.ts'
test('all seven licensed donor library drawings are valid self-contained scenes', () => {
  const samples = JSON.parse(fs.readFileSync(new URL('./sample-scenes.json', import.meta.url), 'utf8'))
  assert.equal(samples.length, 7)
  for(const sample of samples) {
    assert.ok(sample.title)
    const result = parseScene(serializeScene(sample.scene))
    assert.ok(result.elements.length >= 1)
    assert.deepEqual(result.files, {})
  }
})

test('donor source provenance is exact and every licensed library element is retained', async () => {
  const crypto = await import('node:crypto')
  const manifest = JSON.parse(fs.readFileSync(new URL('./support/samples/PROVENANCE.json', import.meta.url), 'utf8'))
  for (const source of manifest.sources) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(`./support/samples/donor/${source.local}`, import.meta.url))).digest('hex'), source.sha256)
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('./support/samples/donor/LICENSE', import.meta.url))).digest('hex'), manifest.license_sha256)
  const samples = JSON.parse(fs.readFileSync(new URL('./sample-scenes.json', import.meta.url), 'utf8'))
  assert.equal(samples.reduce((count: number, sample: {scene: {elements: unknown[]}}) => count + sample.scene.elements.length, 0), 41)
  assert.deepEqual(samples.map((sample: {scene: {elements: unknown[]}}) => sample.scene.elements.length), [1, 7, 4, 4, 9, 11, 5])
  assert.equal(manifest.counts.elements, 41)
})
