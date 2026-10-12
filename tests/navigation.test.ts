import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {connectHouseBridge} from '@agentshouse/app-bridge';
import {createHouseBridgeTestHost} from '@agentshouse/app-bridge/test-host';
const output=path.resolve('tests/.navigation.mjs');let module:any;
before(async()=>{await build({entryPoints:['src/navigation.ts'],outfile:output,bundle:true,platform:'node',format:'esm',packages:'external'});module=await import(pathToFileURL(output).href);});
after(async()=>fs.rm(output,{force:true}));
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
test('drawing addresses retain exact Room/path identity and reject foreign or malformed addresses',()=>{
 const target={room:'r_one',path:'drawings/Привет #1.md'};assert.deepEqual(module.readDrawingAddress(module.drawingAddress(target)),{target,ready:true,error:null});
 for(const value of ['//evil','https://evil','/drawings?room=r&path=../x','/drawings?room=r&path=p&text=secret','/drawings?room=r&path=p&path=q'])assert(module.readDrawingAddress(value).error);
});
test('official bridge supplies cold selection and Back/Forward without echo',async()=>{
 const target={room:'r_one',path:'drawings/one.md'},host=createHouseBridgeTestHost({address:module.drawingAddress(target)});const nav=new module.DrawingNavigation(connectHouseBridge(host)),off=nav.subscribe(()=>{});await settle();assert.deepEqual(nav.snapshot().target,target);assert.equal(host.navigations.length,0);
 nav.navigate({room:'r_one',path:'drawings/two.md'});await settle();assert.equal(host.navigations.length,1);host.open(module.drawingAddress(target));await settle();assert.deepEqual(nav.snapshot().target,target);assert.equal(host.navigations.length,1);off();
});
