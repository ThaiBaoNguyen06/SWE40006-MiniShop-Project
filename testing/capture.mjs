import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { projectName } from '../scripts/environment.mjs';
const release=process.argv[2];
if(!release)throw new Error('Usage: node testing/capture.mjs RELEASE');
const directory=path.resolve('.local/evidence',release);
fs.mkdirSync(directory,{recursive:true});
const environments={development:8281,testing:8282,staging:8283,production:8284};
const record={at:new Date().toISOString(),release,environments:{},monitoring:null};
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}});
 for(const [name,port] of Object.entries(environments)){
  const url='http://127.0.0.1:'+port;
  const health=await(await fetch(url+'/api/health')).json();
  const database=await(await fetch(url+'/api/db-health')).json();
  const catalogue=await(await fetch(url+'/api/products')).json();
  const systemId=execFileSync('docker',['exec',projectName(name,release)+'-database-1','psql','-U','minishop','-d','minishop','-At','-c','SELECT system_identifier FROM pg_control_system()'],{encoding:'utf8'}).trim();
  if(health.release!==release||database.database!=='connected'||catalogue.count!==8)throw Error('Incorrect state: '+name);
  await page.goto(url);
  await page.locator('.product-card').last().waitFor();
  if(await page.locator('.product-card').count()!==8)throw Error('Missing product cards');
  const tagline=await page.locator('.site-header p').innerText();
  await page.screenshot({path:path.join(directory,name+'.png'),fullPage:true});
  record.environments[name]={url,health,database,catalogueCount:catalogue.count,postgresSystemIdentifier:systemId,tagline};
 }
 if(new Set(Object.values(record.environments).map(x=>x.postgresSystemIdentifier)).size!==4)throw Error('Database instances not independent');
 await page.goto('http://127.0.0.1:9190');
 await page.waitForFunction(()=>document.querySelector('#rows')?.children.length===3);
 record.monitoring=(await(await fetch('http://127.0.0.1:9190/metrics.json')).json()).latest;
 if(record.monitoring.status!=='ok')throw Error('Monitoring is not healthy');
 await page.screenshot({path:path.join(directory,'monitoring.png'),fullPage:true});
}finally{await browser.close()}
fs.writeFileSync(path.join(directory,'verification.json'),JSON.stringify(record,null,2));
console.log('Verified four environments and monitoring: '+release);
