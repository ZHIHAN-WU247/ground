-- Ground Supabase RLS hardening patch
-- Safe to re-run. Apply this after the base schema/full reset.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where role = 'admin'
      and (
        id = auth.uid()
        or lower(email) = lower(auth.email())
      )
  );
$$;

create or replace function public.current_user_owns_email(owner_email text)
returns boolean
language sql
stable
as $$
  select owner_email is not null
    and auth.email() is not null
    and lower(owner_email) = lower(auth.email());
$$;

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

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.recipient_addresses enable row level security;
alter table public.recipient_addresses force row level security;
alter table public.file_assets enable row level security;
alter table public.file_assets force row level security;
alter table public.customer_documents enable row level security;
alter table public.customer_documents force row level security;
alter table public.countries enable row level security;
alter table public.countries force row level security;
alter table public.cities enable row level security;
alter table public.cities force row level security;
alter table public.pricing_tables enable row level security;
alter table public.pricing_tables force row level security;
alter table public.pricing_rules enable row level security;
alter table public.pricing_rules force row level security;
alter table public.carrier_configs enable row level security;
alter table public.carrier_configs force row level security;
alter table public.logistics_orders enable row level security;
alter table public.logistics_orders force row level security;
alter table public.logistics_tracking_events enable row level security;
alter table public.logistics_tracking_events force row level security;
alter table public.products enable row level security;
alter table public.products force row level security;
alter table public.product_skus enable row level security;
alter table public.product_skus force row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_orders force row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_order_items force row level security;
alter table public.banners enable row level security;
alter table public.banners force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles for select
using (
  auth.uid() = id
  or lower(email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles for update
using (auth.uid() = id or lower(email) = lower(auth.email()))
with check (auth.uid() = id or lower(email) = lower(auth.email()));

drop policy if exists "Admins can manage profiles" on public.user_profiles;
create policy "Admins can manage profiles"
on public.user_profiles for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can manage own recipients" on public.recipient_addresses;
create policy "Users can manage own recipients"
on public.recipient_addresses for all
using (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
)
with check (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can manage own documents" on public.customer_documents;
drop policy if exists "Users can read own documents" on public.customer_documents;
create policy "Users can read own documents"
on public.customer_documents for select
using (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can create own documents" on public.customer_documents;
create policy "Users can create own documents"
on public.customer_documents for insert
with check (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can delete own documents" on public.customer_documents;
create policy "Users can delete own documents"
on public.customer_documents for delete
using (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Admins can update documents" on public.customer_documents;
create policy "Admins can update documents"
on public.customer_documents for update
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read own private files" on public.file_assets;
drop policy if exists "Users can read allowed file metadata" on public.file_assets;
create policy "Users can read allowed file metadata"
on public.file_assets for select
using (
  visibility = 'public'
  or auth.uid() = owner_user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can create own file metadata" on public.file_assets;
create policy "Users can create own file metadata"
on public.file_assets for insert
with check (
  auth.uid() = owner_user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Admins can manage file metadata" on public.file_assets;
create policy "Admins can manage file metadata"
on public.file_assets for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Public can read active countries" on public.countries;
create policy "Public can read active countries"
on public.countries for select
using (is_active = true);

drop policy if exists "Public can read active cities" on public.cities;
create policy "Public can read active cities"
on public.cities for select
using (is_active = true);

drop policy if exists "Public can read active pricing tables" on public.pricing_tables;
create policy "Public can read active pricing tables"
on public.pricing_tables for select
using (is_active = true);

drop policy if exists "Public can read active pricing rules" on public.pricing_rules;
create policy "Public can read active pricing rules"
on public.pricing_rules for select
using (
  exists (
    select 1 from public.pricing_tables
    where pricing_tables.id = pricing_rules.pricing_table_id
      and pricing_tables.is_active = true
  )
);

drop policy if exists "Public can read active carriers" on public.carrier_configs;
create policy "Public can read active carriers"
on public.carrier_configs for select
using (is_active = true);

drop policy if exists "Admins can manage reference data" on public.countries;
create policy "Admins can manage reference data"
on public.countries for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can manage cities" on public.cities;
create policy "Admins can manage cities"
on public.cities for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can manage pricing tables" on public.pricing_tables;
create policy "Admins can manage pricing tables"
on public.pricing_tables for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can manage pricing rules" on public.pricing_rules;
create policy "Admins can manage pricing rules"
on public.pricing_rules for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can manage carriers" on public.carrier_configs;
create policy "Admins can manage carriers"
on public.carrier_configs for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read own logistics orders" on public.logistics_orders;
create policy "Users can read own logistics orders"
on public.logistics_orders for select
using (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can create own logistics orders" on public.logistics_orders;
create policy "Users can create own logistics orders"
on public.logistics_orders for insert
with check (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Admins can update logistics orders" on public.logistics_orders;
drop policy if exists "Admins can manage logistics orders" on public.logistics_orders;
create policy "Admins can manage logistics orders"
on public.logistics_orders for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read own logistics events" on public.logistics_tracking_events;
create policy "Users can read own logistics events"
on public.logistics_tracking_events for select
using (
  public.current_user_is_admin()
  or exists (
    select 1 from public.logistics_orders
    where logistics_orders.id = logistics_tracking_events.logistics_order_id
      and (
        logistics_orders.user_id = auth.uid()
        or lower(logistics_orders.owner_email) = lower(auth.email())
      )
  )
);

drop policy if exists "Admins can manage logistics events" on public.logistics_tracking_events;
create policy "Admins can manage logistics events"
on public.logistics_tracking_events for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (is_published = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Public can read product skus" on public.product_skus;
drop policy if exists "Public can read active product skus" on public.product_skus;
create policy "Public can read active product skus"
on public.product_skus for select
using (
  exists (
    select 1 from public.products
    where products.id = product_skus.product_id
      and products.is_published = true
  )
);

drop policy if exists "Admins can manage product skus" on public.product_skus;
create policy "Admins can manage product skus"
on public.product_skus for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Public can read active banners" on public.banners;
create policy "Public can read active banners"
on public.banners for select
using (is_active = true);

drop policy if exists "Admins can manage banners" on public.banners;
create policy "Admins can manage banners"
on public.banners for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read own shop orders" on public.shop_orders;
create policy "Users can read own shop orders"
on public.shop_orders for select
using (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Users can create own shop orders" on public.shop_orders;
create policy "Users can create own shop orders"
on public.shop_orders for insert
with check (
  auth.uid() = user_id
  or lower(owner_email) = lower(auth.email())
  or public.current_user_is_admin()
);

drop policy if exists "Admins can update shop orders" on public.shop_orders;
drop policy if exists "Admins can manage shop orders" on public.shop_orders;
create policy "Admins can manage shop orders"
on public.shop_orders for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Users can read own shop order items" on public.shop_order_items;
create policy "Users can read own shop order items"
on public.shop_order_items for select
using (
  public.current_user_is_admin()
  or exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.shop_order_id
      and (
        shop_orders.user_id = auth.uid()
        or lower(shop_orders.owner_email) = lower(auth.email())
      )
  )
);

drop policy if exists "Users can create own shop order items" on public.shop_order_items;
create policy "Users can create own shop order items"
on public.shop_order_items for insert
with check (
  public.current_user_is_admin()
  or exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.shop_order_id
      and (
        shop_orders.user_id = auth.uid()
        or lower(shop_orders.owner_email) = lower(auth.email())
      )
  )
);

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs for select
using (public.current_user_is_admin());

drop policy if exists "Admins can create audit logs" on public.audit_logs;
create policy "Admins can create audit logs"
on public.audit_logs for insert
with check (public.current_user_is_admin());

revoke all on all tables in schema public from anon, authenticated;

grant select on public.countries to anon, authenticated;
grant select on public.cities to anon, authenticated;
grant select on public.pricing_tables to anon, authenticated;
grant select on public.pricing_rules to anon, authenticated;
grant select on public.carrier_configs to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_skus to anon, authenticated;
grant select on public.banners to anon, authenticated;

grant select on public.user_profiles to authenticated;
grant update (display_name) on public.user_profiles to authenticated;
grant select, insert, update, delete on public.recipient_addresses to authenticated;
grant select, insert, delete on public.customer_documents to authenticated;
grant update on public.customer_documents to authenticated;
grant select, insert on public.file_assets to authenticated;
grant update, delete on public.file_assets to authenticated;
grant select, insert on public.logistics_orders to authenticated;
grant update, delete on public.logistics_orders to authenticated;
grant select, insert, update, delete on public.logistics_tracking_events to authenticated;
grant insert, update, delete on public.countries to authenticated;
grant insert, update, delete on public.cities to authenticated;
grant insert, update, delete on public.pricing_tables to authenticated;
grant insert, update, delete on public.pricing_rules to authenticated;
grant insert, update, delete on public.carrier_configs to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_skus to authenticated;
grant insert, update, delete on public.banners to authenticated;
grant select, insert on public.shop_orders to authenticated;
grant update, delete on public.shop_orders to authenticated;
grant select, insert on public.shop_order_items to authenticated;
grant update, delete on public.shop_order_items to authenticated;
grant select, insert on public.audit_logs to authenticated;

grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
