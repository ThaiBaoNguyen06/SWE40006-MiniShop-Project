import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { root, state } from './environment.mjs';
const directory=path.join(state,'automation');fs.mkdirSync(directory,{recursive:true});
const lock=path.join(directory,'worker.lock');
if(fs.existsSync(lock)){
 try{process.kill(Number(fs.readFileSync(lock,'utf8')),0);console.log('Local automation worker is already running.');process.exit(0)}catch{}
}
const output=fs.openSync(path.join(directory,'worker.log'),'a');
const child=spawn(process.execPath,['scripts/automation-worker.mjs'],{cwd:root,env:{...process.env,MINISHOP_STATE_DIR:state},windowsHide:true,detached:true,stdio:['ignore',output,output]});
child.unref();fs.closeSync(output);console.log('Started local product automation worker.');
