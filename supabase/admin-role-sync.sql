-- Sync public.user_profiles.role when Supabase Auth app_metadata.role changes.
-- Safe to re-run. Apply in Supabase SQL Editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.app_role else 'customer'::public.app_role end
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
      role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_app_meta_data, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

update public.user_profiles profile
set role = case when auth_user.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.app_role else 'customer'::public.app_role end
from auth.users auth_user
where auth_user.id = profile.id
  and profile.role is distinct from case when auth_user.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.app_role else 'customer'::public.app_role end;
