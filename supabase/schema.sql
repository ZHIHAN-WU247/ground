create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('customer', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.cargo_type as enum ('B2B', 'B2C');
exception when duplicate_object then null;
end $$;

do $$ begin
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
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.shop_order_status as enum (
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'LINKED_TO_LOGISTICS',
    'CANCELLED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.file_visibility as enum ('public', 'private');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
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
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.recipient_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  name text not null,
  phone text not null,
  email text,
  country text not null,
  province text not null,
  city text not null,
  postal_code text not null,
  address_line text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_recipient_addresses_updated_at on public.recipient_addresses;
create trigger set_recipient_addresses_updated_at
before update on public.recipient_addresses
for each row execute function public.set_updated_at();

create table if not exists public.file_assets (
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

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_no text not null,
  file_asset_id uuid references public.file_assets(id) on delete set null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_customer_documents_updated_at on public.customer_documents;
create trigger set_customer_documents_updated_at
before update on public.customer_documents
for each row execute function public.set_updated_at();

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text not null unique,
  name text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name text not null,
  region text,
  postal_code_hint text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (country_id, name)
);

create table if not exists public.pricing_tables (
  id uuid primary key default gen_random_uuid(),
  cargo_type public.cargo_type not null,
  name text not null,
  currency text not null default 'USD',
  is_active boolean not null default false,
  effective_from timestamptz,
  effective_to timestamptz,
  template_version text,
  source_file_asset_id uuid references public.file_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_pricing_tables_updated_at on public.pricing_tables;
create trigger set_pricing_tables_updated_at
before update on public.pricing_tables
for each row execute function public.set_updated_at();

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  pricing_table_id uuid not null references public.pricing_tables(id) on delete cascade,
  destination_country text not null,
  destination_city text not null,
  min_weight_kg numeric(10, 3) not null default 0,
  max_weight_kg numeric(10, 3),
  base_price numeric(12, 2) not null default 0,
  per_kg_price numeric(12, 2) not null default 0,
  volumetric_divisor numeric(10, 2) not null default 6000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.carrier_configs (
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

drop trigger if exists set_carrier_configs_updated_at on public.carrier_configs;
create trigger set_carrier_configs_updated_at
before update on public.carrier_configs
for each row execute function public.set_updated_at();

create table if not exists public.logistics_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_no text not null unique,
  cargo_type public.cargo_type not null,
  status public.logistics_status not null default 'UNDER_REVIEW',
  sender jsonb not null,
  recipient jsonb not null,
  goods_name text not null,
  declared_value numeric(12, 2) not null default 0,
  declared_currency text not null default 'USD',
  tax_id_or_document_no text not null,
  weight_kg numeric(10, 3) not null,
  length_cm numeric(10, 2) not null,
  width_cm numeric(10, 2) not null,
  height_cm numeric(10, 2) not null,
  package_count integer not null default 1,
  tracking_no text unique,
  carrier_config_id uuid references public.carrier_configs(id) on delete set null,
  carrier_reference_no text,
  internal_fulfillment jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_logistics_orders_updated_at on public.logistics_orders;
create trigger set_logistics_orders_updated_at
before update on public.logistics_orders
for each row execute function public.set_updated_at();

create table if not exists public.logistics_tracking_events (
  id uuid primary key default gen_random_uuid(),
  logistics_order_id uuid not null references public.logistics_orders(id) on delete cascade,
  status public.logistics_status not null,
  title text not null,
  description text not null,
  location text,
  occurred_at timestamptz not null default now(),
  source text not null default 'manual',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null,
  description text not null,
  category text not null,
  status text not null default 'draft',
  cover_file_asset_id uuid references public.file_assets(id) on delete set null,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.product_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  model text not null,
  size text not null,
  price numeric(12, 2) not null,
  currency text not null default 'USD',
  stock_label text not null default 'Manual stock',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_no text not null unique,
  status public.shop_order_status not null default 'PENDING_CONFIRMATION',
  recipient jsonb not null,
  total_amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  logistics_order_id uuid references public.logistics_orders(id) on delete set null,
  logistics_reference_no text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_shop_orders_updated_at on public.shop_orders;
create trigger set_shop_orders_updated_at
before update on public.shop_orders
for each row execute function public.set_updated_at();

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  shop_order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku_id uuid references public.product_skus(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
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

drop trigger if exists set_banners_updated_at on public.banners;
create trigger set_banners_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
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

create index if not exists idx_recipient_addresses_user_id on public.recipient_addresses(user_id);
create index if not exists idx_customer_documents_user_id on public.customer_documents(user_id);
create index if not exists idx_file_assets_owner_user_id on public.file_assets(owner_user_id);
create index if not exists idx_logistics_orders_user_id on public.logistics_orders(user_id);
create index if not exists idx_logistics_orders_status on public.logistics_orders(status);
create index if not exists idx_logistics_tracking_events_order_id on public.logistics_tracking_events(logistics_order_id);
create index if not exists idx_pricing_rules_lookup on public.pricing_rules(destination_country, destination_city, min_weight_kg, max_weight_kg);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_product_skus_product_id on public.product_skus(product_id);
create index if not exists idx_shop_orders_user_id on public.shop_orders(user_id);
create index if not exists idx_shop_order_items_order_id on public.shop_order_items(shop_order_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

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

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage own recipients" on public.recipient_addresses;
create policy "Users can manage own recipients"
on public.recipient_addresses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own documents" on public.customer_documents;
create policy "Users can manage own documents"
on public.customer_documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own private files" on public.file_assets;
create policy "Users can read own private files"
on public.file_assets for select
using (visibility = 'public' or auth.uid() = owner_user_id);

drop policy if exists "Users can create own file metadata" on public.file_assets;
create policy "Users can create own file metadata"
on public.file_assets for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "Users can read own logistics orders" on public.logistics_orders;
create policy "Users can read own logistics orders"
on public.logistics_orders for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own logistics orders" on public.logistics_orders;
create policy "Users can create own logistics orders"
on public.logistics_orders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can read own logistics events" on public.logistics_tracking_events;
create policy "Users can read own logistics events"
on public.logistics_tracking_events for select
using (
  exists (
    select 1 from public.logistics_orders
    where logistics_orders.id = logistics_tracking_events.logistics_order_id
      and logistics_orders.user_id = auth.uid()
  )
);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (status = 'active');

drop policy if exists "Public can read product skus" on public.product_skus;
create policy "Public can read product skus"
on public.product_skus for select
using (
  exists (
    select 1 from public.products
    where products.id = product_skus.product_id
      and products.status = 'active'
  )
);

drop policy if exists "Public can read active banners" on public.banners;
create policy "Public can read active banners"
on public.banners for select
using (is_active = true);

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs for select
using (public.current_user_is_admin());

drop policy if exists "Admins can create audit logs" on public.audit_logs;
create policy "Admins can create audit logs"
on public.audit_logs for insert
with check (public.current_user_is_admin());

drop policy if exists "Users can read own shop orders" on public.shop_orders;
create policy "Users can read own shop orders"
on public.shop_orders for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own shop orders" on public.shop_orders;
create policy "Users can create own shop orders"
on public.shop_orders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can read own shop order items" on public.shop_order_items;
create policy "Users can read own shop order items"
on public.shop_order_items for select
using (
  exists (
    select 1 from public.shop_orders
    where shop_orders.id = shop_order_items.shop_order_id
      and shop_orders.user_id = auth.uid()
  )
);
