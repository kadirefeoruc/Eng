const PREFIX='english-offline-lesson-';
const status=document.getElementById('status'),progress=document.getElementById('progress');
let lessons=[],busy=false,refreshing=false;
const packages=new Map();
const name=l=>PREFIX+l.id+'-'+l.revision;
const mb=n=>(n/1e6).toFixed(1)+' MB';
function valid(response,url){
 if(!response?.ok||response.status===206)return false;
 const type=response.headers.get('content-type')||'';
 return !url.endsWith('.mp3')||/audio|octet-stream/.test(type);
}
// Inspect actual files, including complete downloads made by older versions.
// Never discard usable files just because the catalogue revision has changed.
async function inspect(l){
 const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX+l.id+'-'));
 keys.sort((a,b)=>Number(b===name(l))-Number(a===name(l)));
 for(const key of keys){
  const cache=await caches.open(key);let complete=true;
  for(const url of l.assets)if(!valid(await cache.match(url),url)){complete=false;break;}
  if(!complete){await cache.delete('/offline/ready');continue;}
  if(!await cache.match('/offline/ready'))await cache.put('/offline/ready',new Response(JSON.stringify({id:l.id,revision:key.slice((PREFIX+l.id+'-').length),recovered:true})));
  return {cacheName:key,current:key===name(l)};
 }
 return null;
}
async function refresh(){for(const l of lessons)packages.set(l.id,await inspect(l));}
function lock(value){busy=value;document.querySelectorAll('main button').forEach(b=>b.disabled=value);}
function render(){
 const parent=document.getElementById('lessons');parent.replaceChildren();let count=0;
 for(const l of lessons){
  const saved=packages.get(l.id);if(saved)count++;
  const card=document.createElement('article');card.className='lesson';card.id='download-'+l.id;
  const title=document.createElement('h2');title.textContent=(l.id==='grammar'?'':l.id+'. ')+l.title;card.append(title);
  const detail=document.createElement('p');detail.textContent=mb(l.bytes)+(l.id==='grammar'?' · 12 konu · İngilizce + Türkçe ses · test':' · 3 seviye · metin + ses');card.append(detail);
  const state=document.createElement('p');state.className=saved?'ready':'';state.textContent=saved?(saved.current?'✓ Çevrimdışı hazır':'✓ İndirilen ders hazır · Yeni sürüm de mevcut'):'Henüz tam indirilmedi';card.append(state);
  const actions=document.createElement('div');actions.className='actions';
  if(saved){
   const a=document.createElement('a');a.className='open';a.href=(l.id==='grammar'?'/grammar/':'/lessons/'+l.id+'.html')+'?offline=1';a.textContent=l.id==='grammar'?'Grameri aç':'Dersi aç';actions.append(a);
  }
  const button=document.createElement('button');button.textContent=saved?(saved.current?'İndirmeyi kontrol et':'Güncelle'):'İndir';button.disabled=busy;
  button.onclick=()=>saved?.current?check():run([l]);actions.append(button);
  if(saved){const remove=document.createElement('button');remove.className='remove';remove.textContent='Cihazdan kaldır';remove.disabled=busy;remove.onclick=async()=>{
   if(busy||!confirm(l.title+' dersinin bu cihazdaki indirmesi kaldırılsın mı? Hesap kayıtların silinmez.'))return;
   lock(true);try{for(const key of await caches.keys())if(key.startsWith(PREFIX+l.id+'-'))await caches.delete(key);packages.set(l.id,null);render();status.textContent='İndirme cihazdan kaldırıldı; yeniden indirebilirsin.';}finally{lock(false);}
  };actions.append(remove);}
  card.append(actions);parent.append(card);
 }
 const remaining=lessons.filter(l=>!packages.get(l.id));
 document.getElementById('all').textContent=remaining.length?'Tüm dersleri indir · Kalan '+remaining.length+' paket · '+mb(remaining.reduce((s,l)=>s+l.bytes,0)):'Tüm dersler indirildi · Kontrol et';
 const summary=document.getElementById('download-count');if(summary)summary.textContent=count+' / '+lessons.length+' paket açılmaya hazır';
 return count;
}
async function fetchAsset(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{const response=await fetch(url,{cache:'reload',signal:controller.signal});if(!valid(response,url))throw Error('Bir dosya indirilemedi. Bağlantıyı kontrol edip yeniden dene.');return response;}finally{clearTimeout(timer);}
}
async function download(l,index,total){
 const c=await caches.open(name(l));
 // Resume interrupted current-version downloads; do not refetch intact files.
 for(let i=0;i<l.assets.length;i++){
  const url=l.assets[i];status.textContent='Paket '+index+' / '+total+' · '+l.title+' · Dosya '+(i+1)+' / '+l.assets.length;progress.value=i;progress.max=l.assets.length;
  if(!valid(await c.match(url),url))await c.put(url,await fetchAsset(url));
 }
 for(const url of l.assets)if(!valid(await c.match(url),url))throw Error('İndirme doğrulanamadı; cihazda yeterli alan olmayabilir.');
 await c.put('/offline/ready',new Response(JSON.stringify({id:l.id,revision:l.revision})));
 // Keep the older complete copy until the new copy has passed verification.
 for(const key of await caches.keys())if(key.startsWith(PREFIX+l.id+'-')&&key!==name(l))await caches.delete(key);
}
async function run(list){
 if(busy)return;
 if(!navigator.onLine){status.textContent='Yeni dosya indirmek için internete bağlan. Hazır dersleri Dersi aç ile kullanabilirsin.';return;}
 lock(true);progress.hidden=false;const failed=[];
 try{
  if(navigator.storage?.persist)await navigator.storage.persist().catch(()=>false);
  await window.ensureOfflineReady();
  for(let i=0;i<list.length;i++){
   const l=list[i];let quota=false;
   try{await download(l,i+1,list.length);}catch(e){failed.push(l.title);quota=e.name==='QuotaExceededError';}
   packages.set(l.id,await inspect(l));render();
   if(quota)break;
  }
  const count=render();
  status.textContent=count+' / '+lessons.length+' paket hazır. '+(failed.length?'Bazı paketler tamamlanamadı. Hazır dersleri açabilirsin; Tüm dersleri indir eksik dosyalardan devam eder.':'Dersi aç düğmeleriyle hemen okuyup dinleyebilirsin.');
 }catch(e){status.textContent=e.message+' Önceden indirilen dersler korunuyor.';}
 finally{lock(false);progress.hidden=true;render();}
}
async function check(){
 if(busy)return;lock(true);status.textContent='Cihazdaki ders dosyaları kontrol ediliyor…';
 try{await refresh();const count=render();await window.ensureOfflineReady();status.textContent=count+' / '+lessons.length+' paket doğrulandı. Hazır dersleri Dersi aç düğmesinden açabilirsin.';}
 catch(e){status.textContent=e.message+' İndirilen dosyalar silinmedi.';}
 finally{lock(false);}
}
document.getElementById('all').onclick=async()=>{
 if(busy)return;lock(true);
 try{await refresh();render();}catch(e){status.textContent=e.message;return;}finally{lock(false);}
 const todo=lessons.filter(l=>!packages.get(l.id));
 if(!todo.length){status.textContent='Tüm dersler bu cihazda hazır. Dersi aç düğmelerini kullanabilirsin.';return;}
 await run(todo);
};
document.getElementById('check').onclick=check;
async function restore(){
 if(busy||refreshing||!lessons.length)return;refreshing=true;
 try{await refresh();render();}catch(e){status.textContent='İndirmeler kontrol edilemedi: '+e.message;}finally{refreshing=false;}
}
addEventListener('pageshow',restore);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')restore();});
(async()=>{try{
 if(!('serviceWorker' in navigator)||!window.isSecureContext||!('caches' in window))throw Error('Bu tarayıcı çevrimdışı indirmeyi desteklemiyor. Safari veya Chrome ile aç.');
 let response;
 try{response=await fetch('/offline/catalog.json');if(!response.ok)throw Error();}
 catch{for(const key of (await caches.keys()).filter(k=>k.startsWith('english-offline-shell-')).reverse()){response=await(await caches.open(key)).match('/offline/catalog.json');if(response)break;}}
 if(!response)throw Error('Ders listesi yüklenemedi. İnternete bağlanıp yeniden aç.');
 lessons=(await response.json()).lessons;await refresh();const count=render();lock(false);
 if(new URLSearchParams(location.search).has('setup'))document.getElementById('flight-guide')?.focus();
 status.textContent=count+' paket cihazda hazır. '+(count?'Dersi aç düğmeleriyle başlayabilirsin.':'Uçuşta kullanacağın dersleri indir.');
 // Show recovered downloads even when a worker update is delayed.
 try{await window.ensureOfflineReady();}catch(e){status.textContent=e.message+' Cihazdaki '+count+' paket korunuyor.';}
 }catch(e){status.textContent=e.message;}})();
