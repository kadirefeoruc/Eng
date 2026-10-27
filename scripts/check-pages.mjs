import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=path.resolve('_site');let scripts=0;function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(p.endsWith('.js')){new vm.Script(fs.readFileSync(p,'utf8'),{filename:p});scripts++}else if(p.endsWith('.html')){const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){if(/src=|application\//i.test(m[1])||!m[2].trim())continue;new vm.Script(m[2],{filename:p});scripts++}}}}walk(root);
const bridge=fs.readFileSync(path.join(root,'platform/account.js'),'utf8');assert(bridge.includes("url.pathname==='/Eng/api/session'"));assert(bridge.includes("url.pathname!=='/Eng/api/records'"));const register=fs.readFileSync(path.join(root,'offline-register.js'),'utf8');assert(register.includes("scope:'/Eng/'"));const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');const urls=worker.match(/const SHELL_URLS=(\[[^;]+\]);/)[1];for(const u of vm.runInNewContext(urls)){assert(u.startsWith('/Eng/'));const p=path.join(root,u.slice(5));assert(fs.existsSync(p),u)}const catalog=JSON.parse(fs.readFileSync(path.join(root,'offline/catalog.json')));for(const lesson of catalog.lessons)for(const u of lesson.assets){assert(u.startsWith('/Eng/'));assert(fs.existsSync(path.join(root,u.slice(5))),u)}assert.equal(fs.readdirSync(path.join(root,'lessons')).filter(x=>x.endsWith('.html')).length,50);for(let n=1;n<=50;n++){
 const html=fs.readFileSync(path.join(root,'lessons',n+'.html'),'utf8');
 assert(html.includes("for(const panel of ['read']){"),'Completion belongs only to reading: '+n);
 assert(html.includes("if(!loaded||activeLevel!=='hard')"),'Completion rejects other levels: '+n);
 assert(html.includes("currentNote=null;lastSentence=0;syncCompletionVisibility();"),'Level changes update visibility: '+n);
 const match=html.match(/function syncCompletionVisibility\(\)\{[^\n]+\}/);
 assert(match,'Completion visibility function missing: '+n);
 const input={disabled:false},card={hidden:false,style:{},querySelector:()=>input};
 const context={document:{querySelectorAll:()=>[card]},activeLevel:'easy',loaded:true};
 vm.runInNewContext(match[0]+';syncCompletionVisibility()',context);
 assert.equal(card.hidden,true);assert.equal(input.disabled,true);
 context.activeLevel='medium';context.syncCompletionVisibility();assert.equal(card.hidden,true);assert.equal(input.disabled,true);
 context.activeLevel='hard';context.syncCompletionVisibility();assert.equal(card.hidden,false);assert.equal(input.disabled,false);
 context.loaded=false;context.syncCompletionVisibility();assert.equal(input.disabled,true);
}
console.log('PASS:',scripts,'scripts; 50 lessons; all offline assets; account routing and worker scope');
