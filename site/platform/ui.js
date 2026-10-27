(()=>{
 const path=location.pathname,isLesson=/^\/lessons\/\d+(?:\.html)?\/?$/.test(path);let last='1';try{last=localStorage.getItem('platform:last-lesson')||'1';if(isLesson){last=path.match(/\/lessons\/(\d+)/)[1];localStorage.setItem('platform:last-lesson',last);}}catch{}if(!/^\d+$/.test(last))last='1';
 const icons={guess:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01',coach:'M12 3 3 8l9 5 9-5-9-5ZM5 10v7c4 4 10 4 14 0v-7M21 8v8',home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',read:'M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z',listen:'M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v8h4v-8ZM20 12h2v8h-4v-8Z',grammar:'M4 5h16M4 12h10M4 19h7M17 15l3 3 3-5',words:'M5 3h14v18l-7-4-7 4Z',exams:'M7 4H4v17h16V4h-3M8 2h8v4H8ZM8 11l2 2 5-5M8 17h8',conversation:'M3 4h18v13H9l-6 4ZM7 9h10M7 13h6',flight:'M2 13l8-2V3l2-1 2 1v8l8 2v2l-8-1v5l3 2H7l3-2v-5l-8 1Z'};
 function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+icons[name]+'"/></svg>';}
 function link(label,href,key){const a=document.createElement('a');a.href=href;a.innerHTML=icon(key)+'<span>'+label+'</span>';if(key==='guess')a.classList.add('guess-link');if((key==='guess'&&path.startsWith('/guess'))||(key==='home'&&path.startsWith('/home'))||(key==='grammar'&&path.startsWith('/grammar'))||(key==='exams'&&path.startsWith('/denemeler'))||(key==='words'&&path.startsWith('/coach')))a.setAttribute('aria-current','page');return a;}
 const header=document.querySelector('header');if(!header)return;
 header.classList.add('platform-header');if(isLesson)header.classList.add('lesson-header');
 const accountRow=document.createElement('div');accountRow.className='platform-account-row';const accountLink=document.createElement('a');accountLink.className='platform-account-link';accountLink.href='/account/';accountLink.textContent='Hesabım';accountRow.append(accountLink);const accountEmail=document.createElement('span');accountEmail.className='platform-account-email';accountEmail.hidden=true;accountRow.append(accountEmail);header.prepend(accountRow);
 if(window.EngAccount)EngAccount.ready.then(state=>{if(state.user?.email){accountEmail.textContent=state.user.email;accountEmail.hidden=false;}}).catch(()=>{});
 const tabs=isLesson?header.querySelector('[role=tablist]'):null;
 if(tabs){const home=link('Anasayfa','/home/','home');home.className='platform-tab';tabs.prepend(home);const guess=link('Bil Bakalım','/guess/','guess');guess.classList.add('platform-tab');document.getElementById('tab-exams').before(guess);const wordCard=document.querySelector('#words .card');if(wordCard){const coachLink=document.createElement('a');coachLink.className='word-coach-link';coachLink.href='/coach/';coachLink.textContent='Kelime Koçu ile çalış →';const heading=wordCard.querySelector('h2');if(heading)heading.after(coachLink);else wordCard.prepend(coachLink);}const grammar=link('Gramer','/grammar/','grammar');grammar.className='platform-tab';document.getElementById('tab-listen').after(grammar);for(const key of ['read','listen','words','exams','conversation']){const b=document.getElementById('tab-'+key);if(b){const i=document.createElement('span');i.className='platform-icon';i.innerHTML=icon(key);b.prepend(i);}}}
 else{const nav=document.createElement('nav');nav.className='platform-nav';nav.setAttribute('aria-label','Ana gezinme');for(const [label,key,href]of [['Anasayfa','home','/home/'],['Okuma','read','/lessons/'+last+'.html#read'],['Dinleme','listen','/lessons/'+last+'.html#listen'],['Gramer','grammar','/grammar/'],['Kelimelerim','words','/lessons/'+last+'.html#words'],['Bil Bakalım','guess','/guess/'],['Sınav','exams','/lessons/'+last+'.html#exams'],['Konuşma','conversation','/lessons/'+last+'.html#conversation']])nav.append(link(label,href,key));accountRow.after(nav);}

 // The online count represents distinct connected accounts, not total registrations.
 const presenceBadge=document.createElement('span');
 presenceBadge.className='active-members';presenceBadge.textContent='Aktif üyeler: bağlanıyor…';
 const exam=isLesson?document.getElementById('tab-exams'):header.querySelector('.platform-nav a[href*="#exams"]');
 accountRow.insertBefore(presenceBadge,accountLink);
 (async()=>{
  const account=window.EngAccount;if(!account||!exam)return;
  const state=await account.ready;if(!state.user)return;
  if(!navigator.onLine||!window.WebSocket||!crypto.subtle){presenceBadge.textContent='Aktif üye bilgisi kullanılamıyor';return;}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('eng-presence:'+state.user.id));
  const presenceKey=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const topic='realtime:eng-active-members-v1',apiKey='sb_publishable_etGDgvkaC_kssQXrzih6SQ_Rf3YPXS-';
  let socket,heartbeat,retry,ref=0,connected=false,tracked=false,synced=false,stateMap={};
  const send=(event,payload,join='1',channel=topic)=>socket.send(JSON.stringify({topic:channel,event,payload,ref:String(++ref),join_ref:join}));
  const show=()=>{if(connected&&tracked&&synced)presenceBadge.textContent=Object.keys(stateMap).length+' aktif üye';};
  function connect(){
   if(!navigator.onLine){presenceBadge.textContent='Aktif üye bilgisi kullanılamıyor';return;}
   connected=false;tracked=false;synced=false;ref=0;stateMap={};presenceBadge.textContent='Aktif üyeler: bağlanıyor…';
   let token;try{token=JSON.parse(localStorage.getItem('eng:supabase:session')||'null')?.access_token}catch{}
   if(!token){presenceBadge.textContent='Aktif üye bilgisi kullanılamıyor';return;}
   socket=new WebSocket('wss://rykrxoaslfjlugcdrbiz.supabase.co/realtime/v1/websocket?apikey='+encodeURIComponent(apiKey)+'&vsn=1.0.0');
   socket.onopen=()=>{send('phx_join',{config:{broadcast:{ack:false,self:false},presence:{key:presenceKey,enabled:true},postgres_changes:[],private:false},access_token:token});heartbeat=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)send('heartbeat',{},null,'phoenix')},25000)};
   socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}
    if(m.topic!==topic)return;
    if(m.event==='phx_reply'&&m.ref==='1'){
     if(m.payload.status!=='ok'){socket.close();return}
     connected=true;send('presence',{type:'presence',event:'track',payload:{}});
    }else if(m.event==='phx_reply'&&m.ref==='2'){
     if(m.payload.status!=='ok'){socket.close();return}tracked=true;show();
    }else if(m.event==='presence_state'){stateMap=m.payload||{};synced=true;show()}
    else if(m.event==='presence_diff'){
     for(const [key,value] of Object.entries(m.payload.joins||{})){
      const current=stateMap[key]?.metas||[];const refs=new Set(current.map(x=>x.phx_ref));
      stateMap[key]={metas:current.concat((value.metas||[]).filter(x=>!refs.has(x.phx_ref)))};
     }
     for(const [key,value] of Object.entries(m.payload.leaves||{})){
      if(!stateMap[key])continue;const gone=new Set((value.metas||[]).map(x=>x.phx_ref));
      stateMap[key].metas=stateMap[key].metas.filter(x=>!gone.has(x.phx_ref));if(!stateMap[key].metas.length)delete stateMap[key];
     }show();
    }else if(m.event==='phx_error'||m.event==='phx_close')socket.close();
   };
   socket.onclose=()=>{clearInterval(heartbeat);presenceBadge.textContent='Aktif üye bilgisi kullanılamıyor';retry=setTimeout(connect,10000)};
   socket.onerror=()=>socket.close();
  }
  addEventListener('pagehide',()=>{clearTimeout(retry);if(socket){socket.onclose=null;socket.close()}clearInterval(heartbeat)});
  addEventListener('online',()=>{if(!socket||socket.readyState===WebSocket.CLOSED){clearTimeout(retry);connect()}});
  connect();
 })().catch(()=>{presenceBadge.textContent='Aktif üye bilgisi kullanılamıyor'});
 const tools=document.createElement('div');tools.className='platform-tools';const toggle=document.createElement('button');toggle.type='button';toggle.className='flight-switch';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Uçuş modu');let enabled=path.startsWith('/offline')||!navigator.onLine;toggle.setAttribute('aria-checked',String(enabled));toggle.innerHTML=icon('flight')+'<span>Uçuş modu</span><span class="switch-track"><span class="switch-thumb"></span></span>';toggle.onclick=()=>{const next=toggle.getAttribute('aria-checked')!=='true';toggle.setAttribute('aria-checked',String(next));try{localStorage.setItem('platform:flight',next?'1':'0');}catch{}if(next)location.assign('/offline/?setup=1');else if(path.startsWith('/offline'))location.assign('/home/');};let touchX=null;toggle.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});toggle.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>15){e.preventDefault();const wanted=dx>0;if((toggle.getAttribute('aria-checked')==='true')!==wanted)toggle.click();}},{passive:false});accountRow.prepend(toggle);header.append(tools);
 const footer=document.createElement('footer');footer.className='platform-footer';footer.innerHTML='<p>YÖK-DİL ve YDS Sınavlarına yönelik geliştirilmiştir.</p><p>Geliştiren: <a href="https://www.linkedin.com/in/kadirefeoruc/" target="_blank" rel="noopener noreferrer">K. Efe ORUÇ</a></p>';document.body.append(footer);
 if(isLesson){const syncTab=()=>{const target=location.hash.slice(1);if(['read','listen','words','exams','conversation'].includes(target))document.getElementById('tab-'+target)?.click();};addEventListener('hashchange',syncTab);document.querySelectorAll('[role=tab]').forEach(b=>b.addEventListener('click',()=>history.replaceState(null,'','#'+b.getAttribute('aria-controls'))));const target=location.hash.slice(1);if(['read','listen','words','exams','conversation'].includes(target))document.getElementById('tab-'+target)?.click();}
})();
