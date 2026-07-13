-- Ground Supabase full reset script
-- WARNING: this drops and recreates every object in the public schema.

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

create extension if not exists "pgcrypto" with schema public;

create type public.app_role as enum ('customer', 'admin');
create type public.cargo_type as enum ('B2B', 'B2C');
create type public.currency_code as enum ('CNY', 'USD', 'RUB');
create type public.logistics_delivery_method as enum ('TO_DOOR', 'TO_WAREHOUSE');
create type public.logistics_route_id as enum ('air-ems', 'air-cdek', 'land-cdek', 'land-russia-post');
create type public.logistics_review_state as enum ('PENDING', 'TRACKING_FAILED', 'APPROVED', 'REJECTED');
create type public.logistics_tracking_source as enum ('MANUAL', 'AUTO', 'CARRIER_API');
create type public.carrier_create_state as enum ('NOT_SUBMITTED', 'SUBMITTED', 'NUMBER_READY', 'FAILED');
create type public.carrier_label_status as enum ('NOT_REQUESTED', 'SUBMITTED', 'PROCESSING', 'READY', 'EXPIRED', 'FAILED');
create type public.carrier_tracking_sync_status as enum ('NOT_STARTED', 'SYNCED', 'FAILED');
create type public.shop_order_status as enum ('PENDING_CONFIRMATION', 'CONFIRMED', 'LINKED_TO_LOGISTICS', 'CANCELLED');
create type public.file_visibility as enum ('public', 'private');

create type public.logistics_status as enum (
  'UNDER_REVIEW',
  'REJECTED',
  'APPROVED',
  'ACCEPTED',
  'TRANSFER_TO_HUB',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED_CUSTOMS_WAREHOUSE',
  'CUSTOMS_CLEARANCE',
  'CUSTOMS_RELEASED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'EXCEPTION'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'customer',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

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

create table public.recipient_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  owner_email text,
  kind text not null default 'recipient' check (kind in ('recipient', 'sender')),
  label text not null,
  name text not null,
  phone text not null,
  email text,
  country text not null,
  province text not null,
  city text not null,
  postal_code text not null,
  address_line text not null,
  location_code text,
  fias_guid text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or owner_email is not null)
);

create trigger set_recipient_addresses_updated_at
before update on public.recipient_addresses
for each row execute function public.set_updated_at();

create table public.file_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text,
  bucket text not null,
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  visibility public.file_visibility not null default 'private',
  purpose text not null,
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  owner_email text,
  document_type text not null,
  document_no text not null,
  file_asset_id uuid references public.file_assets(id) on delete set null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or owner_email is not null)
);

create trigger set_customer_documents_updated_at
before update on public.customer_documents
for each row execute function public.set_updated_at();

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text not null unique,
  name text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name text not null,
  region text,
  postal_code_hint text,
  location_code text,
  fias_guid text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (country_id, name)
);

create table public.pricing_tables (
  id uuid primary key default gen_random_uuid(),
  cargo_type public.cargo_type not null,
  route_id public.logistics_route_id,
  delivery_method public.logistics_delivery_method not null default 'TO_DOOR',
  name text not null,
  currency public.currency_code not null default 'USD',
  is_active boolean not null default false,
  effective_from timestamptz,
  effective_to timestamptz,
  template_version text,
  source_file_asset_id uuid references public.file_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_pricing_tables_updated_at
before update on public.pricing_tables
for each row execute function public.set_updated_at();

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  pricing_table_id uuid not null references public.pricing_tables(id) on delete cascade,
  destination_country text not null,
  destination_city text not null,
  min_weight_kg numeric(10, 3) not null default 0,
  max_weight_kg numeric(10, 3),
  base_price numeric(12, 2) not null default 0,
  per_kg_price numeric(12, 2) not null default 0,
  first_mile_price numeric(12, 2) not null default 0,
  last_mile_price numeric(12, 2) not null default 0,
  volumetric_divisor numeric(10, 2) not null default 6000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (max_weight_kg is null or max_weight_kg > min_weight_kg)
);

create table public.carrier_configs (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null unique,
  display_name text not null,
  api_base_url text,
  credential_ref text,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_carrier_configs_updated_at
before update on public.carrier_configs
for each row execute function public.set_updated_at();

create table public.logistics_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  owner_email text,
  order_no text not null unique,
  cargo_type public.cargo_type not null,
  route_id public.logistics_route_id not null default 'air-cdek',
  delivery_method public.logistics_delivery_method not null default 'TO_DOOR',
  status public.logistics_status not null default 'UNDER_REVIEW',
  review_state public.logistics_review_state not null default 'PENDING',
  sender jsonb not null,
  recipient jsonb not null,
  cargo_items jsonb not null default '[]'::jsonb,
  goods_name text not null,
  declared_value numeric(12, 2) not null default 0,
  declared_currency public.currency_code not null default 'CNY',
  tax_id_or_document_no text not null default '',
  weight_kg numeric(10, 3) not null,
  length_cm numeric(10, 2) not null,
  width_cm numeric(10, 2) not null,
  height_cm numeric(10, 2) not null,
  package_count integer not null default 1 check (package_count > 0),
  cdek_tariff_code integer,
  tracking_no text unique,
  tracking_source public.logistics_tracking_source,
  carrier_config_id uuid references public.carrier_configs(id) on delete set null,
  carrier_name text,
  carrier_reference_no text,
  carrier_create_state public.carrier_create_state not null default 'NOT_SUBMITTED',
  carrier_entity_uuid text,
  carrier_request_uuid text,
  carrier_raw_status text,
  carrier_last_error text,
  label_uuid text,
  label_status public.carrier_label_status not null default 'NOT_REQUESTED',
  label_url text,
  label_last_error text,
  tracking_sync_status public.carrier_tracking_sync_status not null default 'NOT_STARTED',
  tracking_synced_at timestamptz,
  review_failure_reason text,
  last_mile_tracking_no text,
  estimated_quote jsonb,
  internal_fulfillment jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_logistics_orders_updated_at
before update on public.logistics_orders
for each row execute function public.set_updated_at();

create table public.logistics_tracking_events (
  id uuid primary key default gen_random_uuid(),
  logistics_order_id uuid not null references public.logistics_orders(id) on delete cascade,
  status public.logistics_status not null,
  title text not null,
  description text not null,
  location text,
  occurred_at timestamptz not null default now(),
  source public.logistics_tracking_source not null default 'MANUAL',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null,
  description text not null,
  category_slug text not null check (category_slug in ('daily', 'tops', 'pants', 'shoes', 'accessories')),
  category text not null,
  is_published boolean not null default false,
  status text generated always as (case when is_published then 'active' else 'draft' end) stored,
  cover_file_asset_id uuid references public.file_assets(id) on delete set null,
  image_url text not null,
  gallery_image_urls jsonb not null default '[]'::jsonb,
  sales_label text,
  origin_label text,
  service_labels jsonb not null default '[]'::jsonb,
  detail_sections jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table public.product_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  model text not null,
  size text not null,
  price numeric(12, 2) not null check (price > 0),
  currency public.currency_code not null default 'USD',
  stock_label text not null default 'Manual stock',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  owner_email text,
  order_no text not null unique,
  status public.shop_order_status not null default 'PENDING_CONFIRMATION',
  recipient jsonb not null,
  total_amount numeric(12, 2) not null default 0,
  currency public.currency_code not null default 'USD',
  logistics_order_id uuid references public.logistics_orders(id) on delete set null,
  logistics_reference_no text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_shop_orders_updated_at
before update on public.shop_orders
for each row execute function public.set_updated_at();

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  shop_order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku_id uuid references public.product_skus(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  product_image_url text not null,
  sku_model text not null,
  sku_size text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  currency public.currency_code not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_file_asset_id uuid references public.file_assets(id) on delete set null,
  image_url text,
  href text,
  placement text not null default 'home',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_banners_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_user_profiles_email on public.user_profiles(email);
create index idx_recipient_addresses_user_id on public.recipient_addresses(user_id);
create index idx_recipient_addresses_owner_email on public.recipient_addresses(owner_email);
create index idx_customer_documents_user_id on public.customer_documents(user_id);
create index idx_file_assets_owner_user_id on public.file_assets(owner_user_id);
create index idx_logistics_orders_user_id on public.logistics_orders(user_id);
create index idx_logistics_orders_owner_email on public.logistics_orders(owner_email);
create index idx_logistics_orders_status on public.logistics_orders(status);
create index idx_logistics_orders_review_state on public.logistics_orders(review_state);
create index idx_logistics_tracking_events_order_id on public.logistics_tracking_events(logistics_order_id);
create index idx_pricing_rules_lookup on public.pricing_rules(destination_country, destination_city, min_weight_kg, max_weight_kg);
create index idx_products_status on public.products(status);
create index idx_products_category_slug on public.products(category_slug);
create index idx_product_skus_product_id on public.product_skus(product_id);
create index idx_shop_orders_user_id on public.shop_orders(user_id);
create index idx_shop_orders_owner_email on public.shop_orders(owner_email);
create index idx_shop_orders_status on public.shop_orders(status);
create index idx_shop_order_items_order_id on public.shop_order_items(shop_order_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

alter table public.user_profiles enable row level security;
alter table public.recipient_addresses enable row level security;
alter table public.file_assets enable row level security;
alter table public.customer_documents enable row level security;
alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.pricing_tables enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.carrier_configs enable row level security;
alter table public.logistics_orders enable row level security;
alter table public.logistics_tracking_events enable row level security;
alter table public.products enable row level security;
alter table public.product_skus enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.banners enable row level security;
alter table public.audit_logs enable row level security;

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
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create policy "Users can read own profile"
on public.user_profiles for select
using (auth.uid() = id or public.current_user_is_admin());

create policy "Users can update own profile"
on public.user_profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can manage profiles"
on public.user_profiles for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Users can manage own recipients"
on public.recipient_addresses for all
using (auth.uid() = user_id or public.current_user_is_admin())
with check (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users can manage own documents"
on public.customer_documents for all
using (auth.uid() = user_id or public.current_user_is_admin())
with check (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users can read allowed file metadata"
on public.file_assets for select
using (visibility = 'public' or auth.uid() = owner_user_id or public.current_user_is_admin());

create policy "Users can create own file metadata"
on public.file_assets for insert
with check (auth.uid() = owner_user_id or public.current_user_is_admin());

create policy "Admins can manage file metadata"
on public.file_assets for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Public can read active countries"
on public.countries for select
using (is_active = true);

create policy "Public can read active cities"
on public.cities for select
using (is_active = true);

create policy "Public can read active pricing tables"
on public.pricing_tables for select
using (is_active = true);

create policy "Public can read active pricing rules"
on public.pricing_rules for select
using (
  exists (
    select 1 from public.pricing_tables
    where pricing_tables.id = pricing_rules.pricing_table_id
      and pricing_tables.is_active = true
  )
);

create policy "Public can read active carriers"
on public.carrier_configs for select
using (is_active = true);

create policy "Admins can manage reference data"
on public.countries for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can manage cities"
on public.cities for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can manage pricing tables"
on public.pricing_tables for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can manage pricing rules"
on public.pricing_rules for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can manage carriers"
on public.carrier_configs for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Users can read own logistics orders"
on public.logistics_orders for select
using (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users can create own logistics orders"
on public.logistics_orders for insert
with check (auth.uid() = user_id or public.current_user_is_admin());

create policy "Admins can update logistics orders"
on public.logistics_orders for update
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Users can read own logistics events"
on public.logistics_tracking_events for select
using (
  public.current_user_is_admin()
  or exists (
    select 1 from public.logistics_orders
    where logistics_orders.id = logistics_tracking_events.logistics_order_id
      and logistics_orders.user_id = auth.uid()
  )
);

create policy "Admins can manage logistics events"
on public.logistics_tracking_events for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Public can read active products"
on public.products for select
using (is_published = true);

create policy "Admins can manage products"
on public.products for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Public can read active product skus"
on public.product_skus for select
using (
  exists (
    select 1 from public.products
    where products.id = product_skus.product_id
      and products.is_published = true
  )
);

create policy "Admins can manage product skus"
on public.product_skus for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Public can read active banners"
on public.banners for select
using (is_active = true);

create policy "Admins can manage banners"
on public.banners for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Users can read own shop orders"
on public.shop_orders for select
using (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users can create own shop orders"
on public.shop_orders for insert
with check (auth.uid() = user_id or public.current_user_is_admin());

create policy "Admins can update shop orders"
on public.shop_orders for update
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Users can read own shop order items"
on public.shop_order_items for select
using (
  public.current_user_is_admin()
  or exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.shop_order_id
      and shop_orders.user_id = auth.uid()
  )
);

create policy "Users can create own shop order items"
on public.shop_order_items for insert
with check (
  public.current_user_is_admin()
  or exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.shop_order_id
      and shop_orders.user_id = auth.uid()
  )
);

create policy "Admins can read audit logs"
on public.audit_logs for select
using (public.current_user_is_admin());

create policy "Admins can create audit logs"
on public.audit_logs for insert
with check (public.current_user_is_admin());

insert into public.countries (iso_code, name)
values
  ('RU', 'Russia'),
  ('KZ', 'Kazakhstan'),
  ('BY', 'Belarus'),
  ('CN', 'China')
on conflict (iso_code) do nothing;

insert into public.cities (country_id, name, region, postal_code_hint, location_code, fias_guid)
select countries.id, city.name, city.region, city.postal_code_hint, city.location_code, city.fias_guid
from public.countries
join (
  values
    ('RU', 'Moscow', 'Moscow', '101000', '44', 'c2deb16a-0330-4f05-821f-1d09c93331e6'),
    ('RU', 'Saint Petersburg', 'Saint Petersburg', '190000', null, null),
    ('KZ', 'Almaty', 'Almaty', '050000', null, null),
    ('BY', 'Minsk', 'Minsk', '220000', null, null),
    ('CN', 'Shenzhen', 'Guangdong', '518000', null, null)
) as city(iso_code, name, region, postal_code_hint, location_code, fias_guid)
on countries.iso_code = city.iso_code
on conflict (country_id, name) do nothing;

insert into public.carrier_configs (provider_code, display_name, api_base_url, credential_ref, is_active, metadata)
values
  ('fixed', 'Fixed mock carrier', null, null, true, '{"mode":"mock"}'::jsonb),
  ('cdek', 'CDEK', 'https://api.cdek.ru/v2', 'CDEK_CLIENT_ID/CDEK_CLIENT_SECRET', true, '{"mode":"api"}'::jsonb)
on conflict (provider_code) do update
set display_name = excluded.display_name,
    api_base_url = excluded.api_base_url,
    credential_ref = excluded.credential_ref,
    is_active = excluded.is_active,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.pricing_tables (cargo_type, route_id, delivery_method, name, currency, is_active, template_version)
values
  ('B2C', 'air-cdek', 'TO_DOOR', 'Default B2C air CDEK door pricing', 'USD', true, '2026-07-09'),
  ('B2C', 'land-cdek', 'TO_WAREHOUSE', 'Default B2C land CDEK warehouse pricing', 'USD', true, '2026-07-09')
returning id;

grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all routines in schema public to postgres, service_role;
grant execute on all routines in schema public to authenticated, anon;
grant all on all sequences in schema public to postgres, service_role;
grant usage, select on all sequences in schema public to authenticated, anon;

alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on routines to postgres, service_role;
alter default privileges in schema public grant execute on routines to authenticated, anon;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, anon;
