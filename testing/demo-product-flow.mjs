import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
const directory=path.resolve('.local/evidence/product-form');fs.mkdirSync(directory,{recursive:true});
const token=fs.readFileSync(path.resolve('.local/automation/admin-token'),'utf8').trim();
const base='http://127.0.0.1:8281';
const config=await(await fetch(base+'/api/product-proposals/config')).json();
if(!config.enabled||config.mode!=='local')throw Error('This diagnostic only runs in enabled local demo mode');
const productName='Automation Demo Speaker';
const before=await(await fetch('http://127.0.0.1:8284/api/products')).json();
if(before.products.some(p=>p.name===productName))throw Error('Demo product already exists; choose a new name');
const browser=await chromium.launch();
let proposal;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1200}});
 await page.goto(base);
 await page.getByRole('button',{name:'Add a product',exact:true}).click();
 await page.getByLabel('Admin access code').fill(token);
 await page.getByLabel('Product name',{exact:true}).fill(productName);
 await page.getByLabel('Description',{exact:true}).fill('Product submitted through the website to demonstrate automatic staging and approval.');
 await page.getByLabel('Price',{exact:true}).fill('39.90');
 await page.getByLabel('Stock quantity').fill('7');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/product-proposals')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Submit for staging'}).click();
 const response=await responsePromise;
 proposal=await response.json();
 if(response.status()!==202)throw Error('Product proposal was rejected');
 fs.writeFileSync(path.join(directory,'request.json'),JSON.stringify({id:proposal.id,productName,productionBeforeCount:before.count},null,2));
 await page.screenshot({path:path.join(directory,'submitted.png'),fullPage:true});
 console.log('Website submission accepted. Proposal '+proposal.id);
 let last;
 for(let attempt=0;attempt<150;attempt++){
  const state=await(await fetch(base+'/api/product-proposals/'+proposal.id,{headers:{Authorization:'Bearer '+token}})).json();
  if(state.status!==last){console.log('Status: '+state.status);last=state.status}
  if(state.status==='failed')throw Error(state.message);
  if(state.status==='staging_passed'){
   const production=await(await fetch('http://127.0.0.1:8284/api/products')).json();
   const staging=await(await fetch('http://127.0.0.1:8283/api/products')).json();
   if(production.count!==before.count||production.products.some(p=>p.name===productName))throw Error('Production changed before approval');
   if(!staging.products.some(p=>p.name===productName))throw Error('Proposed product missing from staging');
   await page.getByRole('button',{name:'Approve production (local demo)'}).waitFor({timeout:15000});
   await page.screenshot({path:path.join(directory,'awaiting-approval.png'),fullPage:true});
   fs.writeFileSync(path.join(directory,'staging-verification.json'),JSON.stringify({proposalId:proposal.id,status:state.status,stagingCount:staging.count,productionCount:production.count,productionUnchanged:true,githubPrCreated:false},null,2));
   console.log('PASS: staging contains the new product; production is unchanged.');
   break;
  }
  if(attempt===149)throw Error('Timed out waiting for staging');
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
}finally{await browser.close()}
