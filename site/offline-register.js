window.ensureOfflineReady=async function(){
 if(!('serviceWorker' in navigator)||!window.isSecureContext)throw Error('Çevrimdışı kullanım için Safari veya Chrome ile doğrudan siteyi aç.');
 let reg=await navigator.serviceWorker.getRegistration('/');
 if(navigator.onLine||!reg){try{reg=await Promise.race([navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Bağlantı zaman aşımı')),5000))]);}catch(e){if(!reg)throw e;}}
 if(navigator.onLine)reg.update().catch(()=>{});
 const started=Date.now();
 while(Date.now()-started<25000){
  if(navigator.serviceWorker.controller){
   const report=await new Promise(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>resolve(null),900);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data);channel.port1.close();};navigator.serviceWorker.controller.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);});
   if(report?.version>=6&&report.ready)return report;
  }
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Çevrimdışı açılış henüz hazır değil. İnternet açıkken bu sayfayı Safari’de yenile; özel gezinme kullanma.');
};
if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
function showOfflineNotice(){let box=document.getElementById('offline-notice');if(!box){box=document.createElement('div');box.id='offline-notice';box.setAttribute('role','status');box.style.cssText='padding:12px 16px;background:#fff2cc;color:#382900;font:16px system-ui';document.body.prepend(box);}box.hidden=navigator.onLine;box.textContent='Çevrimdışısın. İndirilen metinler ve sesler kullanılabilir. Canlı AI ve hesaba kayıt internet gerektirir.';}
addEventListener('online',showOfflineNotice);addEventListener('offline',showOfflineNotice);showOfflineNotice();
