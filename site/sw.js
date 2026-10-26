const SHELL='english-offline-shell-v7';
const PREFIX='english-offline-lesson-';
const SHELL_URLS=['/account/profile.js','/platform/account.js','/account/','/home/','/home/app.js','/home/lessons.json','/platform/ui.css','/platform/ui.js','/offline/','/offline/app.js','/offline/style.css','/offline/catalog.json','/offline-register.js','/offline.webmanifest','/favicon.svg','/grammar/','/grammar/app.js','/grammar/style.css','/grammar/topics.json','/grammar/cefr-topics.json'];
const cleanResponse=async r=>new Response(await r.arrayBuffer(),{status:r.status,statusText:r.statusText,headers:r.headers});
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL);
 for(const url of SHELL_URLS){const r=await fetch(new Request(url,{cache:'reload'}));if(!r.ok)throw Error('Offline shell failed: '+url);await cache.put(url,await cleanResponse(r));}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const key of await caches.keys())if(key.startsWith('english-offline-shell-')&&key!==SHELL)await caches.delete(key);})()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='CHECK_OFFLINE')return;
 event.waitUntil((async()=>{const c=await caches.open(SHELL),missing=[];for(const u of SHELL_URLS)if(!await c.match(u))missing.push(u);event.ports[0]?.postMessage({version:6,ready:missing.length===0,missing});})());
});
async function cached(url){
 const parsed=new URL(url,self.location.origin);let target=parsed.href;
 const lesson=parsed.pathname.match(/^\/lessons\/(\d+)(?:\.html)?\/?$/);
 if(lesson)target=self.location.origin+'/lessons/'+lesson[1]+'.html';
 if(['/offline','/offline/index.html'].includes(parsed.pathname))target=self.location.origin+'/offline/';
 if(['/home','/home/index.html'].includes(parsed.pathname))target=self.location.origin+'/home/';
 if(['/grammar','/grammar/index.html'].includes(parsed.pathname))target=self.location.origin+'/grammar/';
 // The current shell wins over older lesson bundles when shared assets are updated.
 const shell=await(await caches.open(SHELL)).match(target,{ignoreSearch:true});if(shell)return shell;
 for(const key of (await caches.keys()).filter(k=>k.startsWith(PREFIX)).reverse()){
  const cache=await caches.open(key);if(!await cache.match('/offline/ready'))continue;
  const hit=await cache.match(target,{ignoreSearch:true});if(hit)return hit;
 }
}
async function ranged(response,range){
 const data=await response.arrayBuffer(),size=data.byteLength,m=/^bytes=(\d*)-(\d*)$/.exec(range);
 if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Math.min(Number(m[2]),size-1):size-1):size-1;
 if(start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(data.slice(start,end+1),{status:206,headers});
}
async function network(req,timeout=30000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  // Navigation requests carry redirect: manual. Follow the host's .html ->
  // extensionless redirects instead of treating an opaque redirect as an error.
  const r=await fetch(req,{signal:controller.signal,cache:'no-cache',redirect:'follow'});
  if(!r.ok)throw Error('HTTP '+r.status);
  // A synthetic response can be returned to the original manual navigation.
  return r.redirected?await cleanResponse(r):r;
 }finally{clearTimeout(timer);}
}
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/signin'))return;
 const allowed=url.pathname.startsWith('/audio/')||url.pathname.startsWith('/lessons/')||url.pathname.startsWith('/home')||url.pathname.startsWith('/platform/')||url.pathname.startsWith('/grammar')||url.pathname.startsWith('/offline')||url.pathname==='/favicon.svg'||url.pathname==='/'||url.pathname==='/lesson';if(!allowed)return;
 event.respondWith((async()=>{
  if(req.mode!=='navigate'&&req.cache==='reload')return network(req,60000);
  let target=url.href;
  if(url.pathname==='/lesson')target='/lessons/'+(url.searchParams.get('lesson')||'1')+'.html';
  if(url.pathname==='/')target='/home/';
  const hit=await cached(target);
  const audio=url.pathname.startsWith('/audio/')||url.pathname.startsWith('/grammar/audio/');
  const offline=self.navigator?.onLine===false;
  if(hit&&(audio||offline||url.searchParams.get('offline')==='1'))return req.headers.has('Range')?ranged(hit,req.headers.get('Range')):cleanResponse(hit);
  try{
   const response=await network(req);
   // Refresh shell resources online; never mark a partial lesson download as complete.
   if(SHELL_URLS.includes(url.pathname)){try{const cache=await caches.open(SHELL);await cache.put(url.pathname,await cleanResponse(response.clone()));}catch{}}
   return response;
  }catch{
   if(hit)return req.headers.has('Range')?ranged(hit,req.headers.get('Range')):cleanResponse(hit);
   if(req.mode==='navigate'&&offline){const fallback=await cached('/offline/');if(fallback)return cleanResponse(fallback);}
   if(req.mode==='navigate')return new Response('<!doctype html><html lang=tr><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Ders bağlantısı</title><body style="font:18px/1.7 system-ui;padding:32px;max-width:640px;margin:auto"><h1>Ders şu anda açılamadı</h1><p>Dersi çevrimiçi açmak için indirmen gerekmez. Bağlantı kısa süreli yanıt vermedi.</p><p><a href="">Tekrar dene</a> · <a href="/home/">Anasayfa</a></p></body></html>',{status:503,headers:{'Content-Type':'text/html;charset=utf-8'}});
   return new Response('Bu dosya cihazda yok. İnternet açıkken Uçuş modu sayfasından indir.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
 })());
});
