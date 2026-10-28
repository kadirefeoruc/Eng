-- KEO: Admin yetkisi ve üye takibi. SQL Editor > New query > Run.
begin;
-- Yönetici olarak Supabase SQL Editor'de çalıştırın.
-- Bir ay = ilk üyelik kontrolünden itibaren bir takvim ayı.

create table if not exists public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 trial_started_at timestamptz not null default now(),
 trial_ends_at timestamptz not null default (now() + interval '1 month'),
 paid_until timestamptz,
 check (trial_ends_at > trial_started_at)
);
alter table public.memberships enable row level security;
revoke all on public.memberships from public, anon, authenticated;
grant select on public.memberships to authenticated;
grant all on public.memberships to service_role;
drop policy if exists read_own_membership on public.memberships;
create policy read_own_membership on public.memberships for select to authenticated
 using ((select auth.uid()) = user_id);

create or replace function public.membership_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.memberships; ends_at timestamptz;
begin
 if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 insert into public.memberships (user_id) values (uid) on conflict (user_id) do nothing;
 select * into strict m from public.memberships where user_id = uid;
 ends_at := greatest(m.trial_ends_at, coalesce(m.paid_until, m.trial_ends_at));
 return jsonb_build_object(
  'configured', true,
  'active', ends_at > now(),
  'plan', case when m.paid_until > now() then 'paid' when m.trial_ends_at > now() then 'trial' else 'expired' end,
  'trial_started_at', m.trial_started_at,
  'trial_ends_at', m.trial_ends_at,
  'paid_until', m.paid_until,
  'remaining_days', greatest(0, ceil(extract(epoch from (ends_at - now())) / 86400)::integer),
  'server_time', now()
 );
end;
$$;
revoke all on function public.membership_status() from public, anon;
grant execute on function public.membership_status() to authenticated;

create or replace function public.has_course_access()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.memberships
  where user_id = (select auth.uid())
   and (trial_ends_at > now() or paid_until > now())
 );
$$;
revoke all on function public.has_course_access() from public, anon;
grant execute on function public.has_course_access() to authenticated;

-- Gelecekteki özel içerik için: Storage panelinde eng-course-private adlı
-- private bucket ayrıca oluşturulmalıdır. Bu SQL dosya taşımaz.
drop policy if exists active_members_read_course on storage.objects;
create policy active_members_read_course on storage.objects for select to authenticated
 using (bucket_id = 'eng-course-private' and (select public.has_course_access()));



-- Mevcut üyelik SQL'inden sonra, aynı işlem içinde uygulanır.
create table if not exists public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.platform_member_controls (
 user_id uuid primary key references auth.users(id) on delete cascade,
 disabled boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.platform_activity (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active_seconds bigint not null default 0 check(active_seconds >= 0),
 last_seen_at timestamptz not null default now(),
 measured_since timestamptz not null default now(),
 previous_active boolean not null default false
);
create table if not exists public.platform_readings (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_number integer not null check(lesson_number between 1 and 50),
 level text not null check(level in ('easy','medium','hard')),
 completed_at timestamptz not null default now(),
 primary key(user_id,lesson_number,level)
);
create table if not exists public.platform_admin_audit (
 id bigint generated always as identity primary key,
 actor_id uuid,
 target_id uuid,
 action text not null,
 created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
alter table public.platform_member_controls enable row level security;
alter table public.platform_activity enable row level security;
alter table public.platform_readings enable row level security;
alter table public.platform_admin_audit enable row level security;
revoke all on public.platform_admins, public.platform_member_controls, public.platform_activity, public.platform_readings, public.platform_admin_audit from public,anon,authenticated;
grant all on public.platform_admins, public.platform_member_controls, public.platform_activity, public.platform_readings, public.platform_admin_audit to service_role;
grant usage,select on sequence public.platform_admin_audit_id_seq to service_role;

do $$ declare admin_id uuid; begin
 select id into admin_id from auth.users where lower(email)='kadirefeoruc@gmail.com' and email_confirmed_at is not null;
 if admin_id is null then raise exception 'Doğrulanmış kadirefeoruc@gmail.com hesabı bulunamadı. Authentication > Users bölümünü kontrol edin.'; end if;
 insert into public.platform_admins(user_id) values(admin_id) on conflict do nothing;
end $$;

create or replace function public.platform_member_enabled()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid()
  and (u.banned_until is null or u.banned_until<=now())
  and not exists(select 1 from public.platform_member_controls c where c.user_id=u.id and c.disabled));
$$;
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select public.platform_member_enabled() and exists(select 1 from public.platform_admins where user_id=auth.uid());
$$;
create or replace function public.platform_self_status()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('configured',true,'enabled',public.platform_member_enabled(),'admin',public.is_platform_admin());
$$;
revoke all on function public.platform_member_enabled(),public.is_platform_admin(),public.platform_self_status() from public,anon;
grant execute on function public.platform_member_enabled(),public.is_platform_admin(),public.platform_self_status() to authenticated;

alter table public.lesson_progress enable row level security;
drop policy if exists platform_enabled_members_only on public.lesson_progress;
create policy platform_enabled_members_only on public.lesson_progress as restrictive for all to authenticated
 using(user_id=(select auth.uid()) and (select public.platform_member_enabled()))
 with check(user_id=(select auth.uid()) and (select public.platform_member_enabled()));

create or replace function public.has_course_access()
returns boolean language sql stable security definer set search_path='' as $$
 select public.platform_member_enabled() and (public.is_platform_admin() or exists (
 select 1 from public.memberships where user_id=auth.uid() and (trial_ends_at>now() or paid_until>now())));
$$;

create or replace function public.platform_activity_ping(p_active boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); stamp timestamptz:=clock_timestamp(); old public.platform_activity; delta bigint;
begin
 if not public.platform_member_enabled() then raise exception 'Hesap pasif veya oturum geçersiz.' using errcode='42501'; end if;
 insert into public.platform_activity(user_id,last_seen_at,previous_active) values(uid,stamp,p_active) on conflict do nothing;
 select * into old from public.platform_activity where user_id=uid for update;
 delta:=floor(extract(epoch from stamp-old.last_seen_at));
 -- Aynı kullanıcıdaki sekmeler süreyi katlamaz; uzun kesintiler sayılmaz.
 if delta<10 then return; end if;
 update public.platform_activity set active_seconds=active_seconds+
  case when p_active and old.previous_active and delta<=60 then greatest(0,delta) else 0 end,
  last_seen_at=stamp,previous_active=p_active where user_id=uid;
end $$;
create or replace function public.platform_reading_finished(p_lesson integer,p_level text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.platform_member_enabled() then raise exception 'Hesap pasif veya oturum geçersiz.' using errcode='42501'; end if;
 if p_lesson not between 1 and 50 or p_level not in ('easy','medium','hard') or p_level is null or p_lesson is null then raise exception 'Geçersiz metin'; end if;
 insert into public.platform_readings(user_id,lesson_number,level) values(auth.uid(),p_lesson,p_level) on conflict do nothing;
end $$;
revoke all on function public.platform_activity_ping(boolean), public.platform_reading_finished(integer,text) from public,anon;
grant execute on function public.platform_activity_ping(boolean), public.platform_reading_finished(integer,text) to authenticated;

-- Yalnız sunucudaki service_role bu listeyi okuyabilir.
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
 coalesce(s.active_seconds,0) active_seconds,s.last_seen_at,s.measured_since,
 (select count(*) from public.lesson_progress l where l.user_id=u.id and l.lesson_id ~ '^completion:([1-9]|[1-4][0-9]|50)$' and l.completed=true) completed_lessons,
 (select count(*) from public.platform_readings r where r.user_id=u.id) listened_texts
 from auth.users u left join public.platform_member_controls c on c.user_id=u.id
 left join public.platform_activity s on s.user_id=u.id
 where p_search='' or strpos(lower(coalesce(u.email,'')),lower(p_search))>0
 order by u.created_at desc,u.id limit 50 offset (greatest(1,least(p_page,10000))-1)*50
 ) t;
 return jsonb_build_object('users',result,'total',total,'page',p_page,'page_size',50);
end $$;
revoke all on function public.platform_admin_members(integer,text) from public,anon,authenticated;
grant execute on function public.platform_admin_members(integer,text) to service_role;

commit;
select public.is_platform_admin(); -- SQL Editor oturumunda false normaldir.
select u.email, a.created_at from public.platform_admins a join auth.users u on u.id=a.user_id;
