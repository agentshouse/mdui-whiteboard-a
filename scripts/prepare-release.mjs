import fs from 'node:fs';
for(const file of ['app.json','schema.yaml']) fs.copyFileSync(file,`public/${file}`);
fs.copyFileSync('LICENSE','public/LICENSE.txt');
