(()=>{
'use strict';
const BASE='https://rykrxoaslfjlugcdrbiz.supabase.co', KEY='sb_publishable_etGDgvkaC_kssQXrzih6SQ_Rf3YPXS-', native=window.fetch.bind(window), SESSION='eng:supabase:session';
let session;try{session=JSON.parse(localStorage.getItem(SESSION)||'null')}catch{}let refreshing;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
function storeSession(s){session=s; if(s)localStorage.setItem(SESSION,JSON.stringify(s));else localStorage.removeItem(SESSION)}
async function auth(path,body){const r=await native(BASE+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.msg||data.error_description||data.message||'Giriş işlemi tamamlanamadı');return data}
async function token(){if(!session)return null;if((session.expires_at||0)*1000<Date.now()+60000&&navigator.onLine){refreshing ||= auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(storeSession).finally(()=>refreshing=null);await refreshing}return session?.access_token}
function localKey(){return 'eng:records:'+session.user.id}
function readLocal(){try{return JSON.parse(localStorage.getItem(localKey())||'{"items":{},"pending":{}}')}catch{return {items:{},pending:{}}}}
function putLocal(data){localStorage.setItem(localKey(),JSON.stringify(data))}
async function rest(path,options={}){const access=await token();if(!access)throw Error('Önce giriş yap');return native(BASE+'/rest/v1/'+path,{...options,headers:{apikey:KEY,Authorization:'Bearer '+access,'Content-Type':'application/json',...options.headers}})}
let flushing;
function flush(){if(flushing)return flushing;flushing=(async()=>{if(!session||!navigator.onLine)return;const uid=session.user.id;let data=readLocal();for(const [key,entry] of Object.entries(data.pending)){if(session?.user.id!==uid)return;const value=entry.value;const path='lesson_progress?'+(value===null?'user_id=eq.'+uid+'&lesson_id=eq.'+encodeURIComponent(key):'on_conflict=user_id,lesson_id');const r=await rest(path,value===null?{method:'DELETE'}:{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:uid,lesson_id:key,position:{value},completed:key.startsWith('completion:')&&!!value.completed,updated_at:new Date().toISOString()})});if(!r.ok)throw Error('Kayıt eşitlenemedi');data=readLocal();if(data.pending[key]?.revision===entry.revision){delete data.pending[key];putLocal(data)}}})().finally(()=>flushing=null);return flushing}
window.fetch=async(input,options={})=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin!==location.origin)return native(input,options);if(url.pathname==='/api/session')return json({user:session?{displayName:session.user.email,id:session.user.id}:null});if(url.pathname!=='/api/records')return native(input,options);if(!session)return json({error:'Unauthorized'},401);try{const method=(options.method||'GET').toUpperCase();if(method==='PUT'){const {key,value}=JSON.parse(options.body);if(typeof key!=='string'||key.length>200)return json({error:'Invalid key'},400);const data=readLocal();if(value===null)delete data.items[key];else data.items[key]=value;data.pending[key]={value,revision:crypto.randomUUID()};putLocal(data);flush().catch(()=>{});return json({ok:true,queued:true})}await flush();let data=readLocal();if(navigator.onLine){const r=await rest('lesson_progress?select=lesson_id,position&limit=10000');if(!r.ok)throw Error('Kayıtlar yüklenemedi');const rows=await r.json();const items={};for(const row of rows)if(row.position&&Object.hasOwn(row.position,'value'))items[row.lesson_id]=row.position.value;data=readLocal();for(const [k,e]of Object.entries(data.pending)){if(e.value===null)delete items[k];else items[k]=e.value}data.items=items;putLocal(data)}return json({items:Object.entries(data.items).map(([key,value])=>({key,value}))})}catch(e){if(!navigator.onLine){const data=readLocal();return json({items:Object.entries(data.items).map(([key,value])=>({key,value}))})}return json({error:e.message},503)}};
window.EngAccount={get user(){return session?.user},async signIn(email,password){const s=await auth('token?grant_type=password',{email,password});storeSession(s);location.assign('/home/')},async signUp(email,password){const s=await auth('signup',{email,password});if(s.access_token){storeSession(s);location.assign('/home/');return}return 'E-posta adresine gelen doğrulama bağlantısını aç. Ardından bu sayfadan giriş yap.'},async signOut(){try{await native(BASE+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+await token()}})}finally{storeSession(null);location.assign('/account/')}}};
addEventListener('online',()=>flush().catch(()=>{}));addEventListener('storage',e=>{if(e.key===SESSION)location.reload()});
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('a[href^="/signin-with-chatgpt"]').forEach(a=>{a.href='/account/';a.textContent='Üye ol / Giriş yap'});const host=document.querySelector('.platform-tools')||document.querySelector('header');if(host){const a=document.createElement('a');a.href='/account/';a.textContent=session?'Profilim / Üyeliğim':'Üye ol / Giriş yap';a.style.cssText='display:inline-block;padding:9px 14px;border-radius:9px;background:white;color:#153f78;margin:8px;text-decoration:none';host.append(a)}});

// Navigation controls are a UI boundary; confidential content needs server-side delivery.
const accountPage=/\/account(?:\/|$)/.test(location.pathname);
const gate=document.createElement('style');gate.id='eng-member-gate';gate.textContent='html{visibility:hidden!important}';
if(!accountPage)document.documentElement.append(gate);
function accountRedirect(){location.replace('/account/');}
async function authUser(method='GET',body){
 const access=await token();if(!access)throw Error('Önce giriş yapmalısın.');
 const r=await native(BASE+'/auth/v1/user',{method,headers:{apikey:KEY,Authorization:'Bearer '+access,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok){const e=Error(data.msg||data.message||data.error_description||'İşlem tamamlanamadı.');e.status=r.status;throw e;}
 const user=data.user||data;storeSession({...session,user,verified_at:Date.now()});return user;
}
async function membership(){
 if(!session)return null;
 if(!navigator.onLine)return session.membership||null;
 const r=await rest('rpc/membership_status',{method:'POST',body:'{}'});
 if(!r.ok){if(r.status===404)return {configured:false};throw Error('Üyelik durumu şu anda doğrulanamıyor.');}
 const status=await r.json();storeSession({...session,membership:status});return status;
}
async function reauthenticate(password){
 if(!session||!password)throw Error('Mevcut şifreni yaz.');
 const result=await auth('token?grant_type=password',{email:session.user.email,password});
 storeSession(result);
}
Object.assign(window.EngAccount,{
 async updateProfile(firstName,lastName,phone){
  if(firstName.length>80||lastName.length>80||!firstName.trim()||!lastName.trim())throw Error('İsim ve soyisim alanlarını kontrol et.');
  if(!/^[+\d\s()\-]{0,30}$/.test(phone))throw Error('Telefon numarasını kontrol et.');
  return authUser('PUT',{data:{...session.user.user_metadata,first_name:firstName.trim(),last_name:lastName.trim(),contact_phone:phone.trim()}});
 },
 async updateEmail(email,password){await reauthenticate(password);return authUser('PUT',{email});},
 async updatePassword(currentPassword,newPassword){if(newPassword.length<12)throw Error('Yeni şifren en az 12 karakter olmalı.');await reauthenticate(currentPassword);return authUser('PUT',{password:newPassword});},
 membership,
 ready:(async()=>{
  if(!session){if(!accountPage)accountRedirect();return {user:null};}
  try{
   if(navigator.onLine)await authUser();
   else if(!session.verified_at)throw Error('İlk giriş için internet gerekiyor.');
   const status=await membership();
   if(!accountPage&&status?.configured!==false&&status?.active===false){accountRedirect();return {user:session.user,membership:status};}
   gate.remove();return {user:session.user,membership:status};
  }catch(e){if(e.status===401||e.status===403)storeSession(null);if(!accountPage)accountRedirect();return {user:session?.user||null,error:e.message};}
 })()
});
addEventListener('pageshow',event=>{if(event.persisted&&!accountPage){if(!session)accountRedirect();else location.reload();}});
document.addEventListener('DOMContentLoaded',async()=>{
 const result=await EngAccount.ready;
 if(!result.user)return;
 const host=document.querySelector('.platform-tools')||document.querySelector('header');if(!host)return;
 const badge=document.createElement('a');badge.href='/account/#membership';badge.style.cssText='display:inline-block;background:#fff3cf;color:#4d3700;padding:8px 12px;border-radius:9px;margin:8px';
 const m=result.membership;
 badge.textContent=m?.plan==='paid'?'Ücretli üyelik aktif':m?.active?'Deneme süresi: '+m.remaining_days+' gün kaldı':m?.configured===false?'Deneme süresi kurulumu bekleniyor':m?.active===false?'Deneme süresi sona erdi':'Üyelik durumu';
 host.append(badge);
});
})();
