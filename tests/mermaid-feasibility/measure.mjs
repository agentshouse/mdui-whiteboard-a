import { build } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(root, '.mermaid-feasibility-dist');
if(!process.env.MEASURE_SKIP_BUILD) await build({ root, build: { outDir, rollupOptions: { input: path.join(import.meta.dirname,'index.html') } } });
const files=[];
function walk(dir){ for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else files.push({path:path.relative(outDir,file),bytes:fs.statSync(file).size});} }
walk(outDir);
const bytes = files.reduce((sum,file)=>sum+file.bytes,0);
const lock = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'package-lock.probe.json')));
const packageVersion = (name) => { const entry = Object.entries(lock.packages).find(([key]) => key.endsWith('node_modules/' + name)); if(!entry) throw new Error('Missing probe dependency: ' + name); return entry[1].version; };
const result = { bytes, mebibytes:bytes/(1024*1024), files:files.length, baselineBytes:18726413, additionalBytes:bytes-18726413, limitBytes:20*1024*1024, excessBytes:Math.max(0,bytes-20*1024*1024), packages:Object.fromEntries(['@excalidraw/mermaid-to-excalidraw','mermaid','@mermaid-js/parser'].map(name=>[name,packageVersion(name)])), largestFiles:files.sort((a,b)=>b.bytes-a.bytes).slice(0,20) };
fs.writeFileSync(path.join(import.meta.dirname,'size-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
