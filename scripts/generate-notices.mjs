import fs from 'node:fs'
import path from 'node:path'
import { loadSupplementalLicenses } from './supplemental-licenses.mjs'

const root = path.resolve(import.meta.dirname, '..')
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const separator = '\n' + '='.repeat(80) + '\n'
const parts = [
  'THIRD-PARTY NOTICES\n\nWhiteboard includes software from the packages listed below. This notices file\ncontains license and notice files distributed with the installed production\ndependency closure, a superset of the packages bundled into the web app.\n\nPackage license identifiers are reported as published, without inferring\nrights that a package does not grant. Dependency versions are from package-lock.json.\n',
  separator + 'Donor: excalidraw/excalidraw\nCommit: e65eca999e071503efb893d3379a29fb96ff37c4\n\n' + fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'),
]
parts.push(separator + 'Source package: @excalidraw/laser-pointer\n\n' + fs.readFileSync(path.join(root, 'packages/laser-pointer/LICENSE'), 'utf8'))
const supplemental = loadSupplementalLicenses(root)
const recovered = []
const missing = []
let count = 0
for (const [relative, entry] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!relative || entry.dev) continue
  const directory = path.join(root, relative)
  const manifest = path.join(directory, 'package.json')
  if (!fs.existsSync(manifest)) continue // Optional platform package is not installed or bundled.
  const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  const files = fs.readdirSync(directory).filter((file) =>
    /^(licen[cs]e|copying|copyright|notice)(?:[.\-_]|$)/i.test(file) && fs.statSync(path.join(directory, file)).isFile()
  ).sort()
  const identifier = typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license ?? pkg.licenses ?? 'Not declared')
  parts.push(separator + `${pkg.name} ${pkg.version}\nLicense identifier: ${identifier}\n`)
  if (!files.length) {
    parts.push('\nNo license or notice file was distributed at the package root.\n')
    const recovery = supplemental.get(`${pkg.name}@${pkg.version}`)
    if (recovery && identifier !== 'UNLICENSED') {
      if (recovery.declaredLicense !== identifier) throw new Error(`Recovered license identifier mismatch: ${pkg.name}`)
      const { text, ...provenance } = recovery
      parts.push(`\n--- ${recovery.basis === 'spdx-declaration' ? 'Standard SPDX text for the declared license; no upstream notice or author supplied' : 'Recovered from exact official source'} ---\nSource: ${recovery.sourceUrl}\nCommit: ${recovery.commit}\nPublished gitHead: ${recovery.registryGitHead}\nVerification: ${recovery.verification}\nSHA-256: ${recovery.sha256}\n${recovery.licenseTextSourceUrl ? `Standard text source: ${recovery.licenseTextSourceUrl}\nCopyright holder: not provided by the package; placeholders below are unchanged.\n` : ''}\n${text}\n`)
      recovered.push(provenance)
    } else {
      missing.push({ name: pkg.name, version: pkg.version, license: identifier })
    }
  }
  for (const file of files) {
    parts.push(`\n--- ${file} ---\n\n` + fs.readFileSync(path.join(directory, file), 'utf8') + '\n')
  }
  count += 1
}
fs.writeFileSync(path.join(root, 'public/THIRD_PARTY_NOTICES.txt'), parts.join(''))
fs.writeFileSync(path.join(root, 'public/licenses/SUPPLEMENTAL-PROVENANCE.json'), JSON.stringify(recovered, null, 2) + '\n')
console.log(JSON.stringify({ packages: count, recoveredNotices: recovered.map(({name,version,sourceUrl}) => ({name,version,sourceUrl})), missingLicenseFiles: missing }, null, 2))
