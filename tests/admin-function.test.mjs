import {readFileSync} from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=readFileSync('supabase/functions/eng-admin/index.ts','utf8').replace('export async function','async function');
const admin='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
function setup({authorized=true,disabled=false,invalid=false,targetAdmin=false}={}){let handler;const calls=[];
 const context={Request,Response,Date,Error,JSON,Number,Math,encodeURIComponent,Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://db.test':'SERVER-ONLY-SECRET'},serve:h=>handler=h},fetch:async(url,options={})=>{const path=new URL(url).pathname;calls.push({url,options,path});let data={};let status=200;
 if(path==='/auth/v1/user'){if(invalid){status=401;data={message:'Invalid JWT'}}else data={id:admin,email_confirmed_at:'2026-01-01'}}
 else if(path==='/rest/v1/platform_admins')data=url.includes(member)?(targetAdmin?[{user_id:member}]:[]):authorized?[{user_id:admin}]:[];
 else if(path==='/rest/v1/platform_member_controls')data=options.method==='GET'?[{disabled}]:null;
 else if(path.startsWith('/auth/v1/admin/users/'))data={id:path.split('/').pop(),email:'member@example.test'};
 else if(path==='/auth/v1/admin/users')data={id:member};
 else if(path==='/rest/v1/rpc/platform_admin_members')data={users:[],total:0,page:1};
 return new Response(JSON.stringify(data),{status});}};
 vm.runInNewContext(source,context);return {calls,run:body=>handler(new Request('https://fn.test',{method:'POST',headers:{Authorization:'Bearer user-jwt',Origin:'https://kadirefeoruc.github.io'},body:JSON.stringify(body)})),handler};}
for(const config of [{authorized:false},{disabled:true},{invalid:true}]){const t=setup(config);const r=await t.run({action:'delete',user_id:member,confirm_email:'member@example.test'});assert([401,403].includes(r.status));assert(!t.calls.some(c=>c.options.method==='DELETE'))}
const noToken=setup();assert.equal((await noToken.handler(new Request('https://fn.test',{method:'POST',body:'{}'}))).status,401);
const foreign=setup();assert.equal((await foreign.handler(new Request('https://fn.test',{method:'POST',headers:{Origin:'https://attacker.test'}}))).status,403);
for(const action of ['password','disable','enable','delete']){const t=setup();assert.equal((await t.run({action,user_id:admin,password:'some-password-123',confirm_email:'member@example.test'})).status,403)}
const otherAdmin=setup({targetAdmin:true});assert.equal((await otherAdmin.run({action:'delete',user_id:member,confirm_email:'member@example.test'})).status,403);
const short=setup();assert.equal((await short.run({action:'password',user_id:member,password:'short'})).status,400);
const remove=setup();assert.equal((await remove.run({action:'delete',user_id:member,confirm_email:'wrong'})).status,400);assert(!remove.calls.some(c=>c.options.method==='DELETE'));
const disable=setup();assert.equal((await disable.run({action:'disable',user_id:member})).status,200);const writes=disable.calls.filter(c=>['POST','PUT'].includes(c.options.method));assert.equal(writes[0].path,'/rest/v1/platform_member_controls');assert.equal(JSON.parse(writes[0].options.body).disabled,true);assert.equal(JSON.parse(writes[1].options.body).ban_duration,'876000h');
const create=setup();assert.equal((await create.run({action:'create',email:'new@example.test',password:'long-password-123',app_metadata:{admin:true},role:'admin'})).status,200);const created=JSON.parse(create.calls.find(c=>c.path==='/auth/v1/admin/users').options.body);assert.equal(created.app_metadata,undefined);assert.equal(created.role,undefined);assert(!create.calls.some(c=>c.path==='/rest/v1/platform_admins'&&c.options.method!=='GET'));assert(!create.calls.filter(c=>c.path.includes('audit')).some(c=>c.options.body.includes('long-password')));
console.log('PASS: server identity, admin role, disabled users, origin, self/other admin protection, password rules, deletion confirmation, ban order, privilege injection and secret-free audit.');
