-- Giriş sayısı takibi: SQL Editor > New query > Run.
-- Mevcut üyeler, şifreler ve ilerleme kayıtları korunur.
begin;
create table if not exists public.platform_logins (
 session_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 first_seen_at timestamptz not null default now()
);
create index if not exists platform_logins_user_id_idx on public.platform_logins(user_id);
alter table public.platform_logins enable row level security;
revoke all on public.platform_logins from public,anon,authenticated;
grant all on public.platform_logins to service_role;
create or replace function public.platform_activity_ping(p_active boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); stamp timestamptz:=clock_timestamp(); old public.platform_activity; delta bigint; sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
begin
 if not public.platform_member_enabled() then raise exception 'Hesap pasif veya oturum geçersiz.' using errcode='42501'; end if;
 if sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=uid) then
  raise exception 'Oturum geçersiz. Yeniden giriş yapın.' using errcode='42501';
 end if;
 insert into public.platform_logins(session_id,user_id) values(sid,uid) on conflict do nothing;
 insert into public.platform_activity(user_id,last_seen_at,previous_active) values(uid,stamp,p_active) on conflict do nothing;
 select * into old from public.platform_activity where user_id=uid for update;
 delta:=floor(extract(epoch from stamp-old.last_seen_at));
 -- Aynı kullanıcıdaki sekmeler süreyi katlamaz; uzun kesintiler sayılmaz.
 if delta<10 then return; end if;
 update public.platform_activity set active_seconds=active_seconds+
  case when p_active and old.previous_active and delta<=60 then greatest(0,delta) else 0 end,
  last_seen_at=stamp,previous_active=p_active where user_id=uid;
end $$;

revoke all on function public.platform_activity_ping(boolean) from public,anon;
grant execute on function public.platform_activity_ping(boolean) to authenticated;
create or replace function public.platform_admin_members(p_page integer default 1,p_search text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; total bigint;
begin
 select count(*) into total from auth.users u where p_search='' or strpos(lower(coalesce(u.email,'')),lower(p_search))>0;
 select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into result from (
 select u.id,u.email,u.created_at,u.last_sign_in_at,
 coalesce(u.raw_user_meta_data->>'first_name','') first_name,
 coalesce(u.raw_user_meta_data->>'last_name','') last_name,
 (coalesce(c.disabled,false) or coalesce(u.banned_until>now(),false)) disabled,
 exists(select 1 from public.platform_admins a where a.user_id=u.id) is_admin,
 (select count(*) from public.platform_logins g where g.user_id=u.id) login_count,
 (select min(g.first_seen_at) from public.platform_logins g where g.user_id=u.id) login_measured_since,
 coalesce(s.active_seconds,0) active_seconds,s.last_seen_at,s.measured_since,
 (select count(*) from public.lesson_progress l where l.user_id=u.id and l.lesson_id ~ '^completion:([1-9]|[1-4][0-9]|50)$' and l.completed=true) completed_lessons,
 (select count(*) from public.platform_readings r where r.user_id=u.id) listened_texts
 from auth.users u left join public.platform_member_controls c on c.user_id=u.id
 left join public.platform_activity s on s.user_id=u.id
 where p_search='' or strpos(lower(coalesce(u.email,'')),lower(p_search))>0
 order by u.created_at desc,u.id limit 50 offset (greatest(1,least(p_page,10000))-1)*50
 ) t;
 return jsonb_build_object('login_tracking_ready',true,'users',result,'total',total,'page',p_page,'page_size',50);
end $$;
revoke all on function public.platform_admin_members(integer,text) from public,anon,authenticated;
grant execute on function public.platform_admin_members(integer,text) to service_role;

commit;
select 'Giriş sayısı takibi etkinleştirildi' as sonuc;

