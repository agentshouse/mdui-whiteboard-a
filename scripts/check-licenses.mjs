import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadSupplementalLicenses } from './supplemental-licenses.mjs';
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
for (const file of ['LICENSE.txt', 'FONT_NOTICES.txt', 'THIRD_PARTY_NOTICES.txt', 'licenses/GPL-2.txt', 'licenses/LIBERATION-LEGACY-LICENSE.txt', 'licenses/SUPPLEMENTAL-PROVENANCE.json']) {
  assert.equal(fs.readFileSync(path.join(root, 'public', file), 'utf8'), fs.readFileSync(path.join(dist, file), 'utf8'), `Distributed notice differs: ${file}`);
}
assert.equal(fs.readFileSync(path.join(root,'LICENSE'),'utf8'),fs.readFileSync(path.join(dist,'LICENSE.txt'),'utf8'));
const notices=fs.readFileSync(path.join(dist,'THIRD_PARTY_NOTICES.txt'),'utf8');
const gaps=[];
const recovered=[];
const supplemental=loadSupplementalLicenses(root);
const distributedProvenance=JSON.parse(fs.readFileSync(path.join(dist,'licenses/SUPPLEMENTAL-PROVENANCE.json'),'utf8')); 
let packages=0;
for(const [relative,entry] of Object.entries(lock.packages)) {
  if(!relative || entry.dev) continue;
  const directory=path.join(root,relative);
  if(!fs.existsSync(path.join(directory,'package.json'))) continue;
  const pkg=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
  assert(notices.includes(`${pkg.name} ${pkg.version}\n`),`Package omitted from notices: ${pkg.name} ${pkg.version}`);
  const licenseFiles=fs.readdirSync(directory).filter(name=>/^(licen[cs]e|copying|copyright|notice)(?:[.\-_]|$)/i.test(name)&&fs.statSync(path.join(directory,name)).isFile());
  for(const name of licenseFiles) assert(notices.includes(fs.readFileSync(path.join(directory,name),'utf8')),`Package license text not preserved: ${pkg.name}/${name}`);
  if(!licenseFiles.length || pkg.license==='UNLICENSED') {
    const recovery=supplemental.get(`${pkg.name}@${pkg.version}`);
    if(recovery && pkg.license !== 'UNLICENSED') {
      assert.equal(recovery.declaredLicense,pkg.license);
      assert(notices.includes(recovery.text),`Recovered text omitted: ${pkg.name}`);
      assert(notices.includes(recovery.sourceUrl),`Source provenance omitted: ${pkg.name}`);
      const provenance=Object.fromEntries(Object.entries(recovery).filter(([key])=>key!=='text'));
      assert.deepEqual(distributedProvenance.find(item=>item.name===pkg.name && item.version===pkg.version),provenance,`Distributed provenance mismatch: ${pkg.name}`);
      recovered.push({name:pkg.name,version:pkg.version,sourceUrl:recovery.sourceUrl,sha256:recovery.sha256});
    } else {
      gaps.push({name:pkg.name,version:pkg.version,declaredLicense:pkg.license ?? null,packageRootLicenseFiles:licenseFiles.length});
    }
  }
  packages++;
}
const result={preservation:'passed',strictCompleteness:gaps.length?'blocked':'passed',packages,recovered,gaps,scope:'Installed production dependency closure, a conservative superset of the browser bundle. Missing package-root notices use hashed official source text with pinned provenance. The explicitly approved use-composed-ref@1.4.0 exception uses its MIT declaration and pinned standard SPDX text, without claiming a recovered notice or known copyright holder. Other unresolved notices and UNLICENSED metadata remain flagged.'};
console.log(JSON.stringify(result,null,2));
if(gaps.length) process.exitCode=1;
