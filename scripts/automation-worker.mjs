import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { root, state } from './environment.mjs';
const require=createRequire(import.meta.url);
const {validateProduct,validateCatalogue,appendProduct}=require('../backend/dist/catalogue.js');
const automation=path.join(state,'automation');
const queue=path.join(automation,'queue');
fs.mkdirSync(queue,{recursive:true});
const lock=path.join(automation,'worker.lock');
if(fs.existsSync(lock)){
 const old=Number(fs.readFileSync(lock,'utf8'));
 try{process.kill(old,0);console.log('Automation worker already running.');process.exit(0)}catch{fs.unlinkSync(lock)}
}
fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
function unlock(){try{if(fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock)}catch{}}
process.on('exit',unlock);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{unlock();process.exit(0)});
function write(record){const target=path.join(queue,record.id+'.json');const temp=target+'.worker.tmp';fs.writeFileSync(temp,JSON.stringify(record,null,2));fs.renameSync(temp,target)}
function copySource(source,destination){
 fs.mkdirSync(destination,{recursive:true});
 for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  if(['.git','.local','node_modules','dist','artifacts','test-results','playwright-report','EvidenceCollection'].includes(entry.name)||entry.isSymbolicLink()||entry.name==='.env'||entry.name.startsWith('.env.')&&entry.name!=='.env.example')continue;
  const from=path.join(source,entry.name),to=path.join(destination,entry.name);
  if(entry.isDirectory())copySource(from,to);else fs.copyFileSync(from,to);
 }
}
function command(args,cwd,log,extraEnv={}){
 return new Promise((resolve,reject)=>{
  const output=fs.openSync(log,'a');
  const child=spawn(process.execPath,args,{cwd,windowsHide:true,stdio:['ignore',output,output],env:{...process.env,MINISHOP_STATE_DIR:state,...extraEnv}});
  child.once('error',error=>{fs.closeSync(output);reject(error)});
  child.once('exit',code=>{fs.closeSync(output);code===0?resolve():reject(new Error('Automation command failed; see the local job log.'))});
 });
}
async function stage(record){
 record.status='running';record.message='Building the candidate and running checks. Production is unchanged.';write(record);
 const job=path.join(automation,'jobs',record.id),workspace=path.join(job,'source');
 fs.mkdirSync(job,{recursive:true});
 try{
  const product=validateProduct(record.product,record.product.key);
  const current=validateCatalogue(JSON.parse(fs.readFileSync(path.join(root,'backend/catalogue/products.json'),'utf8')));
  const next=appendProduct(current,product);
  copySource(root,workspace);
  fs.writeFileSync(path.join(workspace,'backend/catalogue/products.json'),JSON.stringify(next,null,2)+'\n');
  record.release='proposal-'+record.id;
  await command(['scripts/pipeline.mjs',record.release,'--staging-only'],workspace,path.join(job,'pipeline.log'));
  const cli=path.join(workspace,'testing/node_modules/playwright/cli.js');
  await command([cli,'test'],path.join(workspace,'testing'),path.join(job,'staging-browser.log'),{BASE_URL:'http://127.0.0.1:8283',EXPECTED_RELEASE:record.release});
  record.status='staging_passed';record.message='Staging passed. This is a local review, not a GitHub pull request. Approve to deploy this tested release.';write(record);
 }catch{
  record.status='failed';record.message='Staging checks failed. Production was not promoted. See the local automation log.';write(record);
 }
}
async function promote(record){
 record.status='deploying';record.message='Deploying the tested candidate after your local approval.';write(record);
 const job=path.join(automation,'jobs',record.id),workspace=path.join(job,'source');
 try{
  await command(['scripts/deploy.mjs','production',record.release],workspace,path.join(job,'production.log'));
  const cli=path.join(workspace,'testing/node_modules/playwright/cli.js');
  await command([cli,'test'],path.join(workspace,'testing'),path.join(job,'production-browser.log'),{BASE_URL:'http://127.0.0.1:8284',EXPECTED_RELEASE:record.release});
  const approved=fs.readFileSync(path.join(workspace,'backend/catalogue/products.json'));
  fs.writeFileSync(path.join(root,'backend/catalogue/products.json'),approved);
  await command(['scripts/deploy.mjs','development',record.release],workspace,path.join(job,'development.log'));
  record.status='deployed';record.message='Product verified on Production. Local demo complete; no GitHub PR was created.';write(record);
 }catch{
  record.status='failed';record.message='The production deployment needs attention. Check health and the local job logs before retrying.';write(record);
 }
}
for(const file of fs.readdirSync(queue).filter(name=>/^[a-f0-9-]{36}\.json$/.test(name))){
 try{const record=JSON.parse(fs.readFileSync(path.join(queue,file),'utf8'));if(record.mode==='local'&&['running','deploying'].includes(record.status)){record.status='failed';record.message='Worker was interrupted. Inspect environment health before submitting again.';write(record)}}catch{}
}
console.log('Local product automation worker ready.');
async function loop(){
 try{
  const records=fs.readdirSync(queue).filter(name=>/^[a-f0-9-]{36}\.json$/.test(name)).map(name=>JSON.parse(fs.readFileSync(path.join(queue,name),'utf8'))).filter(item=>item.mode==='local');
  const approved=records.find(item=>item.status==='approved');
  const waitingReview=records.some(item=>item.status==='staging_passed');
  const queued=records.find(item=>item.status==='queued');
  if(approved)await promote(approved);else if(!waitingReview&&queued)await stage(queued);
 }catch{console.error('Automation queue could not be processed; retrying.');}
 setTimeout(loop,2000);
}
loop();
