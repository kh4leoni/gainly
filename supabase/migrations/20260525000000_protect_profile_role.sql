-- =====================================================================
-- Security fix: prevent self-elevation via profiles.role update.
--
-- The "own profile update" RLS policy lets a user update their own row,
-- but does not restrict columns, so any client could:
--   update profiles set role = 'coach' where id = auth.uid()
-- After the next JWT refresh the custom_access_token_hook would propagate
-- 'coach' into app_metadata.user_role, granting access to /coach/* routes.
--
-- Mirrors the pattern used by protect_co_brand_label (20260517000003):
-- only the service role (server actions, migrations) may change role.
-- =====================================================================

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') in ('authenticated', 'anon') then
      raise exception 'role is protected — only service role may modify it';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();
