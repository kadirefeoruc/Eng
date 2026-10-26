'use strict';
const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const TESTS=[{id:'yokdil-1',track:'yokdil',title:'YÖKDİL Karma Deneme 1'},{id:'yokdil-2',track:'yokdil',title:'YÖKDİL Karma Deneme 2'},{id:'yds-1',track:'yds',title:'YDS / e-YDS Deneme 1'},{id:'yds-2',track:'yds',title:'YDS / e-YDS Deneme 2'}];
let track='yokdil',bank=null,attempt=null,user=null,recordsReady=false,loadNumber=0,saveQueue=Promise.resolve(),pending=0;
const attempts={};
const lesson=new URLSearchParams(location.search).get('lesson');if(/^(?:[1-9]|[1-4][0-9]|50)$/.test(lesson||''))document.querySelector('.header-link').href='/lesson?lesson='+lesson;
function status(text){$('save-status').textContent=text;}
function show(id){for(const name of ['catalog','runner','results'])$(name).hidden=name!==id;window.scrollTo({top:0,behavior:'instant'});}
function scoreOf(data){let right=0,wrong=0,blank=0;bank.questions.forEach((q,i)=>{const a=data.answers[i];if(!Number.isInteger(a))blank++;else if(a===q.answerIndex)right++;else wrong++;});return {right,wrong,blank};}
function renderCatalog(){
 $('catalog-title').textContent=track==='yokdil'?'YÖKDİL denemeleri':'YDS / e-YDS denemeleri';$('catalog-description').textContent=track==='yokdil'?'Fen ve sosyal bilimler ekseninde, 20 soruluk özgün karma alıştırmalar.':'YDS ve elektronik uygulaması e-YDS için 20 soruluk özgün İngilizce alıştırmalar.';
 for(const t of ['yokdil','yds'])$('track-'+t).setAttribute('aria-pressed',String(t===track));$('test-cards').replaceChildren();
 for(const test of TESTS.filter(t=>t.track===track)){const card=node('article',undefined,'test-card');card.append(node('h3',test.title),node('p','20 soru · 5 seçenek · Açıklamalı cevaplar','test-meta'));const saved=attempts[test.id];const label=saved?.finished?'Sonuçları gör':saved?'Kaldığın yerden devam et':'Denemeyi başlat';
 if(saved)card.append(node('p',saved.finished?'Tamamlandı':'Yanıtlanan: '+Object.keys(saved.answers||{}).length+'/20','test-meta'));const b=node('button',label,'button primary');b.onclick=()=>openTest(test.id);card.append(b);$('test-cards').append(card);}
}
async function saveAttempt(){
 if(!bank||!attempt)return;attempt.updatedAt=new Date().toISOString();attempts[bank.id]=JSON.parse(JSON.stringify(attempt));
 if(!user||!recordsReady){status('Bu oturumda çözebilirsin. Sonuçları hesabında saklamak için giriş yap.');return;}
 const body=JSON.stringify({key:'mock:'+bank.id,value:attempts[bank.id]});pending++;status('Kaydediliyor…');
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{try{const r=await fetch('/api/records',{method:'PUT',headers:{'Content-Type':'application/json'},body});if(!r.ok)throw Error('save');status('Deneme ilerlemen hesabına kaydedildi.');}catch{status('Kayıt gönderilemedi. Bu sayfadaki yanıtların korunuyor. Bağlantıyı kontrol edip tekrar kaydet.');const retry=node('button','Tekrar kaydet','button');retry.onclick=()=>{retry.remove();saveAttempt();};$('save-status').append(' ',retry);}finally{pending--;}});return saveQueue;
}
async function openTest(id,fresh=false){
 const request=++loadNumber;status('Deneme yükleniyor…');
 try{const r=await fetch('/denemeler/'+id+'.json');if(!r.ok)throw Error();const data=await r.json();if(request!==loadNumber)return;if(data.questions.length!==20)throw Error();bank=data;
 const saved=attempts[id];attempt=!fresh&&saved?.version===bank.version?saved:{version:bank.version,index:0,answers:{},finished:false,startedAt:new Date().toISOString()};
 if(!attempt.answers||Array.isArray(attempt.answers))attempt.answers={};for(const [i,a] of Object.entries(attempt.answers))if(!/^\d+$/.test(i)||Number(i)>19||!Number.isInteger(a)||a<0||a>4)delete attempt.answers[i];attempt.index=Math.min(19,Math.max(0,Number(attempt.index)||0));
 $('test-title').textContent=bank.title;$('test-category').textContent=track==='yokdil'?'YÖKDİL · KARMA ALIŞTIRMA':'YDS / e-YDS · İNGİLİZCE';$('finish-confirm').hidden=true;$('retry-confirm').hidden=true;
 if(attempt.finished){renderResults();show('results');}else{renderQuestion();show('runner');}
 status(user&&recordsReady?'İlerlemen hesabına kaydedilir.':'Bu oturumda çözebilirsin. Kalıcı kayıt için giriş yap.');
 }catch{status('Deneme yüklenemedi. Biraz sonra yeniden dene.');}
}
function renderQuestion(){
 const index=attempt.index,q=bank.questions[index];$('question-counter').textContent='Soru '+(index+1)+' / 20';$('question-category').textContent=q.category||q.type||'';$('question-prompt').textContent=q.prompt;$('passage').hidden=!q.passage;$('passage').textContent=q.passage||'';$('options').querySelectorAll('label').forEach(e=>e.remove());
 q.options.forEach((text,i)=>{const label=node('label',undefined,'option'),input=document.createElement('input');input.type='radio';input.name='answer';input.value=String(i);input.checked=attempt.answers[index]===i;input.onchange=()=>{attempt.answers[index]=i;$('finish-confirm').hidden=true;renderNavigation();saveAttempt();};label.append(input,node('span',String.fromCharCode(65+i)+')','letter'),node('span',text));$('options').append(label);});
 $('previous').disabled=index===0;$('next').textContent=index===19?'Yanıtları gözden geçir':'Sonraki soru';renderNavigation();
}
function renderNavigation(){const holder=$('question-nav');holder.replaceChildren();for(let i=0;i<20;i++){const b=node('button',String(i+1));b.setAttribute('aria-label',(i+1)+'. soru'+(Number.isInteger(attempt.answers[i])?', yanıtlandı':', boş'));b.setAttribute('aria-current',String(i===attempt.index));b.classList.toggle('answered',Number.isInteger(attempt.answers[i]));b.onclick=()=>go(i);holder.append(b);}$('answered-count').textContent=Object.keys(attempt.answers).length+' yanıtlandı · '+(20-Object.keys(attempt.answers).length)+' boş';}
function go(index){attempt.index=index;renderQuestion();saveAttempt();$('question-counter').scrollIntoView({block:'start',behavior:'smooth'});}
function requestFinish(){const blank=20-Object.keys(attempt.answers).length;$('unanswered-message').textContent=blank?blank+' soruyu boş bıraktın. Denemeyi bu yanıtlarla bitirmek istiyor musun?':'Tüm sorular yanıtlandı. Denemeyi bitirip cevapları görmek istiyor musun?';$('confirm-finish').textContent=blank?'Boşlarla birlikte bitir':'Bitir ve sonuçları gör';$('finish-confirm').hidden=false;}
function finish(){attempt.finished=true;attempt.finishedAt=new Date().toISOString();saveAttempt();renderResults();show('results');}
function renderResults(){const score=scoreOf(attempt);$('result-title').textContent=bank.title;$('score').textContent=score.right+' / 20 doğru';$('result-summary').textContent=score.wrong+' yanlış · '+score.blank+' boş';$('review').replaceChildren();
 bank.questions.forEach((q,i)=>{const answer=attempt.answers[i],correct=answer===q.answerIndex;const box=node('details',undefined,'review-card '+(correct?'correct':'incorrect'));box.append(node('summary',(i+1)+'. '+(q.category||q.type||'Soru')+' · '+(correct?'Doğru':Number.isInteger(answer)?'Yanlış':'Boş')));if(q.passage)box.append(node('p',q.passage,'passage'));box.append(node('p',q.prompt));q.options.forEach((opt,k)=>box.append(node('p',(k===q.answerIndex?'✓ ':'')+String.fromCharCode(65+k)+') '+opt+(k===answer?' — Senin seçimin':''))));box.append(node('p',q.explanation,'explanation'));$('review').append(box);});
}
$('previous').onclick=()=>go(Math.max(0,attempt.index-1));$('next').onclick=()=>attempt.index===19?requestFinish():go(attempt.index+1);$('clear-answer').onclick=()=>{delete attempt.answers[attempt.index];renderQuestion();saveAttempt();};$('finish').onclick=requestFinish;$('confirm-finish').onclick=finish;$('cancel-finish').onclick=()=>{$('finish-confirm').hidden=true;};
async function catalog(){if(attempt)await saveAttempt();renderCatalog();show('catalog');}
$('return-catalog').onclick=catalog;$('results-catalog').onclick=catalog;$('new-attempt').onclick=()=>{$('retry-confirm').hidden=false;};$('confirm-retry').onclick=()=>openTest(bank.id,true);
for(const t of ['yokdil','yds'])$('track-'+t).onclick=async()=>{if(attempt)await saveAttempt();track=t;renderCatalog();show('catalog');};
window.addEventListener('beforeunload',e=>{if(pending){e.preventDefault();e.returnValue='';}});
async function init(){
 renderCatalog();
 try{const r=await fetch('/api/session',{cache:'no-store'});if(r.ok){user=(await r.json()).user;if(user){$('login').hidden=true;$('account').hidden=false;$('account').textContent=user.displayName||'Hesabım';const records=await fetch('/api/records',{cache:'no-store'});if(!records.ok)throw Error();for(const item of (await records.json()).items||[])if(/^mock:(?:yokdil|yds)-[12]$/.test(item.key)&&item.value&&typeof item.value==='object')attempts[item.key.slice(5)]=item.value;recordsReady=true;status('Deneme ilerlemen hesabına kaydedilir.');renderCatalog();}else status('Giriş yapmadan çözebilirsin; kalıcı kayıt için hesabınla giriş yap.');}}
 catch{status('Hesap kayıtları yüklenemedi; mevcut kayıtları korumak için kaydetme bekletiliyor. Sayfayı yenileyebilirsin.');}
 try{const r=await fetch('/denemeler/sources.json');if(r.ok){const sources=await r.json();for(const s of sources){const u=new URL(s.url);if(u.protocol!=='https:'||!/(^|\.)(osym|yok)\.gov\.tr$/.test(u.hostname))continue;const li=node('li'),a=node('a',s.title);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';li.append(a);$('source-links').append(li);}}}catch{}
}
init();
