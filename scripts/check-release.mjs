import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const files = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    assert(!entry.isSymbolicLink(), `Release must not contain symlink: ${filename}`)
    if (entry.isDirectory()) walk(filename)
    else { assert(entry.isFile(), `Not a regular file: ${filename}`); files.push(filename) }
  }
}
walk(dist)
assert.equal(files.filter(filename => filename.endsWith('.js')).length, 1, 'All application code, including locales, must be in the initial JavaScript asset; no navigation-time code chunks');
const bytes = files.reduce((sum, filename) => sum + fs.statSync(filename).size, 0)
assert(files.length <= 2000, `Release has ${files.length} files, limit 2000`)
assert(bytes <= 20 * 1024 * 1024, `Release has ${bytes} bytes, limit 20 MiB`)
for (const name of ['app.json', 'schema.yaml']) {
  assert.equal(fs.readFileSync(path.join(root, name), 'utf8'), fs.readFileSync(path.join(dist, name), 'utf8'), `${name} differs from source`)
}
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'app.json'), 'utf8'))
const references = []
const fontFiles = files.filter(filename => filename.endsWith('.woff2'))
assert.equal(fontFiles.length, 234, 'Every donor WOFF2 font must be bundled')
function localAsset(value, from) {
  if (value.startsWith('data:') || value.startsWith('#')) return
  assert(!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value), `External asset ${value} in ${from}`)
  const clean = decodeURIComponent(value.split(/[?#]/)[0])
  const target = clean.startsWith('/') ? path.resolve(dist, '.' + clean) : path.resolve(path.dirname(from), clean)
  assert(target.startsWith(dist + path.sep), `Asset escapes release: ${value}`)
  assert(fs.existsSync(target) && fs.statSync(target).isFile(), `Missing asset ${value} in ${from}`)
  references.push(path.relative(dist, target))
}
assert(typeof manifest.entry === 'string', 'Manifest entry missing')
localAsset(manifest.entry, path.join(dist, 'app.json'))
for (const filename of files) {
  if (filename.endsWith('.html')) {
    const html = fs.readFileSync(filename, 'utf8')
    for (const tag of html.matchAll(/<(?:script|link|img|source|video|audio|iframe)\b[^>]*>/gi)) {
      for (const match of tag[0].matchAll(/\b(?:src|href|poster)\s*=\s*['"]([^'"]+)['"]/gi)) localAsset(match[1], filename)
    }
  }
  if (filename.endsWith('.css')) {
    const css = fs.readFileSync(filename, 'utf8')
    for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)) localAsset(match[1], filename)
    for (const match of css.matchAll(/@import\s+['"]([^'"]+)['"]/gi)) localAsset(match[1], filename)
  }
  if (filename.endsWith('.js')) {
    const js = fs.readFileSync(filename, 'utf8')
    for (const match of js.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) localAsset(match[1], filename)
    for (const match of js.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) localAsset(match[1], filename)
    for (const match of js.matchAll(/['"](\.?\.?\/[^'"]+\.woff2)['"]/g)) localAsset(match[1], filename)
    for (const match of js.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) localAsset(match[1], filename)
    for (const endpoint of ['https://esm.sh/', 'cdn.digitaloceanspaces.com', 'libraries.excalidraw.com', 'firebaseio.com', 'sentry.io', 'youtube.com', 'vimeo.com', 'reddit.com', 'twitter.com', 'figma.com/embed', 'drive.google.com']) assert(!js.includes(endpoint), `Outside service remains: ${endpoint}`)
  }
}
for (const name of ['LICENSE.txt', 'THIRD_PARTY_NOTICES.txt', 'FONT_NOTICES.txt']) assert(fs.existsSync(path.join(dist, name)), `Missing notice: ${name}`)
console.log(JSON.stringify({ result: 'passed', files: files.length, bytes, mebibytes: Number((bytes / 1024 / 1024).toFixed(3)), limitFiles: 2000, limitBytes: 20 * 1024 * 1024, entry: manifest.entry, fontFiles: fontFiles.length, referencedAssets: [...new Set(references)].sort(), verification: 'Local release artifact only; not live publication or browser acceptance.' }, null, 2))
