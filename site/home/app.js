(()=>{
 const select=document.getElementById('home-lesson');let last='1';
 try{last=localStorage.getItem('platform:last-lesson')||'1';}catch{}
 if(!/^([1-9]|[1-4][0-9]|50)$/.test(last))last='1';
 document.querySelectorAll('[data-last-tab]').forEach(a=>a.href='/lessons/'+last+'.html#'+a.dataset.lastTab);
 document.getElementById('continue-read').href='/lessons/'+last+'.html#read';
 document.getElementById('continue-listen').href='/lessons/'+last+'.html#listen';
 select.onchange=()=>{if(select.value)location.assign('/lessons/'+select.value+'.html#read');};
 (async()=>{try{
  const response=await fetch('/home/lessons.json');if(!response.ok)throw Error();const lessons=await response.json();
  select.replaceChildren(new Option('Tema seç ve okumaya başla',''));for(const l of lessons)select.add(new Option(l.id+'. '+l.title,l.id));select.disabled=false;
  const current=lessons.find(l=>l.id===last);document.getElementById('continue-read').textContent='Okumaya devam et · '+(current?.title||last);
  try{const r=await fetch('/api/records');if(!r.ok)return;const data=await r.json();const completed=new Set(data.items.filter(x=>x.key.startsWith('completion:')&&x.value?.completed).map(x=>x.key.split(':')[1]));for(const o of select.options)if(completed.has(o.value))o.textContent+=' ✅';}catch{}
 }catch{document.getElementById('home-status').textContent='Tema listesi yüklenemedi. Aşağıdaki Okuma veya Dinleme bağlantısından devam edebilirsin.';}})();
})();
