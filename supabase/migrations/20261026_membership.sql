-- Yönetici olarak Supabase SQL Editor'de çalıştırın.
-- Bir ay = ilk üyelik kontrolünden itibaren bir takvim ayı.
begin;
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
commit;
