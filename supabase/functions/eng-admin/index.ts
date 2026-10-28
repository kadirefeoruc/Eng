// Supabase Edge Function: eng-admin. Secret keys stay in server environment.
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export async function handleRequest(req){
 const origin=req.headers.get('origin');
 const headers={'Access-Control-Allow-Origin':'https://kadirefeoruc.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&origin!=='https://kadirefeoruc.github.io')return reply({error:'İzin verilmeyen kaynak.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'POST kullanın.'},405);
 try{
  const base=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!secret)throw new HttpError(503,'Sunucu ortamı hazır değil.');
  const authorization=req.headers.get('authorization')||'';
  if(!/^Bearer \S+$/i.test(authorization))throw new HttpError(401,'Önce giriş yapın.');
  async function api(path,method='GET',body,extra={}){
   const r=await fetch(base+path,{method,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
   const text=await r.text();let data;try{data=text?JSON.parse(text):null}catch{data=null}
   if(!r.ok)throw new HttpError(r.status>=500?503:r.status,data?.msg||data?.message||'Sunucu işlemi tamamlanamadı. Kurulum adımlarını kontrol edin.');
   return data;
  }
  // Never trust client-provided email, metadata, user ID or admin flag.
  const caller=await api('/auth/v1/user','GET',undefined,{Authorization:authorization});
  if(!caller?.id||!caller.email_confirmed_at)throw new HttpError(403,'Doğrulanmış yönetici hesabı gerekiyor.');
  const roles=await api('/rest/v1/platform_admins?select=user_id&user_id=eq.'+encodeURIComponent(caller.id));
  const controls=await api('/rest/v1/platform_member_controls?select=disabled&user_id=eq.'+encodeURIComponent(caller.id));
  if(!roles?.length||controls?.[0]?.disabled)throw new HttpError(403,'Bu işlem için yönetici yetkiniz yok.');
  const current=await api('/auth/v1/admin/users/'+caller.id);
  const currentUser=current.user||current;
  if(currentUser.banned_until&&Date.parse(currentUser.banned_until)>Date.now())throw new HttpError(403,'Hesap pasif.');
  const raw=await req.text();if(raw.length>8192)throw new HttpError(413,'İstek çok büyük.');
  let body;try{body=JSON.parse(raw)}catch{throw new HttpError(400,'Geçersiz JSON.');}
  if(!body||Array.isArray(body)||typeof body!=='object')throw new HttpError(400,'Geçersiz istek.');
  if(body.action==='list'){
   const page=Number.isInteger(body.page)?Math.max(1,Math.min(body.page,10000)):1;
   const search=typeof body.search==='string'?body.search.slice(0,200):'';
   return reply(await api('/rest/v1/rpc/platform_admin_members','POST',{p_page:page,p_search:search}));
  }
  if(!['create','password','disable','enable','delete'].includes(body.action))throw new HttpError(400,'Geçersiz işlem.');
  function password(){if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new HttpError(400,'Şifre 12–128 karakter olmalı.');return body.password;}
  let target=body.user_id;
  if(body.action==='create'){
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new HttpError(400,'Geçerli bir e-posta yazın.');
   const first=typeof body.first_name==='string'?body.first_name.trim():'';
   const last=typeof body.last_name==='string'?body.last_name.trim():'';
   if(first.length>80||last.length>80)throw new HttpError(400,'İsim ve soyisim en fazla 80 karakter olabilir.');
   const result=await api('/auth/v1/admin/users','POST',{email,password:password(),email_confirm:true,user_metadata:{first_name:first,last_name:last}});
   target=(result.user||result).id;
  }else{
   if(typeof target!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(target))throw new HttpError(400,'Geçersiz kullanıcı kimliği.');
   const protectedRoles=await api('/rest/v1/platform_admins?select=user_id&user_id=eq.'+encodeURIComponent(target));
   if(target===caller.id||protectedRoles?.length)throw new HttpError(403,'Yönetici hesabı bu panelden değiştirilemez. Kendi şifren için Hesabım sayfasını kullan.');
   const result=await api('/auth/v1/admin/users/'+target);const user=result.user||result;
   if(body.action==='password')await api('/auth/v1/admin/users/'+target,'PUT',{password:password()});
   if(body.action==='disable'){
    // Block RLS access first: existing access tokens must also lose data access.
    await api('/rest/v1/platform_member_controls?on_conflict=user_id','POST',{user_id:target,disabled:true,updated_at:new Date().toISOString()},{Prefer:'resolution=merge-duplicates'});
    try{await api('/auth/v1/admin/users/'+target,'PUT',{ban_duration:'876000h'})}catch{ return reply({ok:true,warning:'Hesabın platform erişimi kapatıldı; giriş engelinin eşitlenmesi için Pasife al işlemini yeniden uygulayın.'}); }
   }
   if(body.action==='enable'){
    await api('/auth/v1/admin/users/'+target,'PUT',{ban_duration:'none'});
    await api('/rest/v1/platform_member_controls?on_conflict=user_id','POST',{user_id:target,disabled:false,updated_at:new Date().toISOString()},{Prefer:'resolution=merge-duplicates'});
   }
   if(body.action==='delete'){
    if(body.confirm_email!==user.email)throw new HttpError(400,'Silmek için üyenin e-posta adresini aynen yazın.');
    await api('/auth/v1/admin/users/'+target,'DELETE');
   }
  }
  let warning;
  try{await api('/rest/v1/platform_admin_audit','POST',{actor_id:caller.id,target_id:target,action:body.action})}catch{warning='İşlem tamamlandı; işlem günlüğü yazılamadı.'}
  return reply({ok:true,...(warning?{warning}:{})});
 }catch(e){return reply({error:e instanceof HttpError?e.message:'İşlem tamamlanamadı. Bağlantıyı ve kurulumu kontrol edin.'},e instanceof HttpError?e.status:500)}
}
Deno.serve(handleRequest);
