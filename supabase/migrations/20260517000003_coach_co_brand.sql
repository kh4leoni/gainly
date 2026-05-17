-- =====================================================================
-- Co-branding label on profiles
-- =====================================================================
-- Adds profiles.co_brand_label so that selected coaches can render a
-- co-branded header logo (e.g. "Gainly × Fanni Savela") while everyone
-- else sees the plain Gainly logo. Clients inherit their coach's label.
--
-- The column is protected by a trigger: authenticated/anon users cannot
-- modify it via the normal "own profile update" RLS path. Only the
-- service role (or DB owner running migrations) may set the value.

alter table public.profiles
  add column if not exists co_brand_label text
    check (co_brand_label is null or length(co_brand_label) between 1 and 60);

create or replace function public.protect_co_brand_label()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.co_brand_label is distinct from old.co_brand_label then
    if coalesce(auth.role(), '') in ('authenticated', 'anon') then
      raise exception 'co_brand_label is protected — only service role may modify it';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_co_brand_label on public.profiles;
create trigger protect_co_brand_label
  before update on public.profiles
  for each row execute function public.protect_co_brand_label();

-- Seed: Fanni Savela's test account (idempotent — no-op if row missing)
update public.profiles
  set co_brand_label = 'Fanni Savela'
  where id = '85619291-887e-423f-8bf1-ac5fce3d62fa';
