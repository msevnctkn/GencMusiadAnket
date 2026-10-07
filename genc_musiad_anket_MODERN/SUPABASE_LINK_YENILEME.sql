-- GENÇ MÜSİAD ANKET - Yönetici paneli link yenileme desteği
-- Supabase > SQL Editor'da BİR KEZ çalıştırın.

create extension if not exists pgcrypto;

create or replace function public.admin_invite_report()
returns table (
  member_id uuid,
  full_name text,
  response_text text,
  submitted_at timestamptz,
  token uuid
)
language sql
security definer
set search_path = public
as $$
  select
    m.id as member_id,
    m.full_name,
    r.response_text,
    r.submitted_at,
    i.token
  from public.members m
  join public.invites i on i.member_id = m.id
  join public.surveys s on s.id = i.survey_id
  left join public.responses r on r.invite_id = i.id
  where s.is_active = true
    and m.is_active = true
    and public.is_admin()
  order by m.full_name;
$$;

revoke all on function public.admin_invite_report() from public, anon;
grant execute on function public.admin_invite_report() to authenticated;

create or replace function public.renew_member_invites(p_member_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  -- Seçilen üyelerin eski cevaplarını temizle.
  delete from public.responses r
  using public.invites i
  where r.invite_id = i.id
    and i.member_id = any(p_member_ids);

  -- Tokenı değiştir: eski link anında geçersiz olur.
  update public.invites
  set token = gen_random_uuid()
  where member_id = any(p_member_ids);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.renew_member_invites(uuid[]) from public, anon;
grant execute on function public.renew_member_invites(uuid[]) to authenticated;
