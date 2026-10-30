import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { root, state } from './environment.mjs';
const exec = promisify(execFile);
let latest = { status:'starting', containers:[] };
const history=[];
fs.mkdirSync(path.join(state,'monitoring'),{recursive:true});
async function sample() {
 const at = new Date().toISOString();
 let containers=[], error;
 try {
  const { stdout } = await exec('docker',['stats','--no-stream','--format','{{json .}}'],{timeout:15000});
  containers=stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)).filter(row=>row.Name.startsWith('minishop-final-production-'));
 } catch(e) { error=e.message; }
 const start=performance.now();
 let healthy=false, statusCode=null;
 try {
  const response=await fetch('http://127.0.0.1:8284/api/db-health',{signal:AbortSignal.timeout(5000)});
  statusCode=response.status; healthy=response.ok && (await response.json()).database==='connected';
 } catch(e) { error=error || e.message; }
 latest={at,status:healthy && containers.length===3 && !error ? 'ok':'error',healthy,statusCode,latencyMs:Number((performance.now()-start).toFixed(2)),containers,error};
 history.push(latest); if(history.length>60) history.shift();
 fs.appendFileSync(path.join(state,'monitoring','metrics.jsonl'),JSON.stringify(latest)+'\n');
}
const page=fs.readFileSync(path.join(root,'monitoring','index.html'));
http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/metrics.json') { res.setHeader('Content-Type','application/json');res.end(JSON.stringify({latest,history})); }
 else if(req.url==='/') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);}
 else {res.statusCode=404;res.end('Not found');}
}).listen(9190,'127.0.0.1',()=>console.log('Production monitoring: http://127.0.0.1:9190'));
async function loop(){ await sample(); setTimeout(loop,5000); }
loop();
