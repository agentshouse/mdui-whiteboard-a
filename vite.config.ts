import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
const root = path.dirname(fileURLToPath(import.meta.url));
const names = ['common','element','fractional-indexing','laser-pointer','math','utils'];
export default defineConfig({
 base: './',
 resolve: { alias: [
   { find: /^@excalidraw\/excalidraw$/, replacement: path.join(root, 'packages/excalidraw/index.tsx') },
   { find: /^@excalidraw\/excalidraw\/(.*)/, replacement: path.join(root, 'packages/excalidraw/$1') },
   ...names.flatMap(name => [
     {find: new RegExp(`^@excalidraw/${name}$`), replacement: path.join(root,`packages/${name}/src/index.ts`)},
     {find: new RegExp(`^@excalidraw/${name}/(.*)`), replacement: path.join(root,`packages/${name}/src/$1`)},
   ])
 ]},
 plugins: [react(),svgr()],
 build: {outDir:'dist',sourcemap:false,assetsInlineLimit:0,rollupOptions:{output:{inlineDynamicImports:true,assetFileNames:'assets/[name]-[hash][extname]'}}},
 define: {'import.meta.env.VITE_APP_ENABLE_TRACKING':'false','import.meta.env.IS_EXCALIDRAW':'false'},
});
