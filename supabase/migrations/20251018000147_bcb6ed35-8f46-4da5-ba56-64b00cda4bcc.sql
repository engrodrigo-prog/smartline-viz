-- Enable PostGIS extension
create extension if not exists postgis;

-- Tenant table
create table if not exists tenant (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  plan text default 'pro',
  active boolean default true,
  created_at timestamptz default now()
);

-- App user table with roles
create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  email text unique,
  role text check (role in ('ORG_ADMIN','POWER_USER','VIEWER')) default 'VIEWER',
  created_at timestamptz default now()
);

-- Dataset catalog
create table if not exists dataset_catalog (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  line_code text not null,
  name text,
  source text default 'LiPowerline',
  upload_user uuid,
  upload_date timestamptz default now(),
  files jsonb,
  status text default 'pending',
  meta jsonb
);

-- Line asset with geometry
create table if not exists line_asset (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  line_code text not null,
  name text,
  file_path text,
  x_left numeric(8,2) not null,
  x_right numeric(8,2) not null,
  geom geometry(LineString, 4674),
  domain_geom geometry(Polygon, 4674),
  utm_zone int,
  utm_srid int,
  src_source text default 'auto',
  created_at timestamptz default now(),
  meta jsonb
);
create index if not exists idx_line_asset_geom on line_asset using gist(geom);
create index if not exists idx_line_asset_domain on line_asset using gist(domain_geom);

-- Tower asset with point geometry
create table if not exists tower_asset (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  line_code text,
  tower_id text,
  altitude_m numeric,
  cota_m numeric,
  structure_type text,
  geom geometry(Point, 4674),
  meta jsonb
);
create index if not exists idx_tower_asset_geom on tower_asset using gist(geom);

-- Span analysis
create table if not exists span_analysis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  line_code text,
  span_id text,
  tower_from text,
  tower_to text,
  span_length_m numeric,
  sag_m numeric,
  angle_deg numeric,
  min_clearance_m numeric,
  meta jsonb
);

-- DEM surface
create table if not exists dem_surface (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  line_code text,
  file_url text,
  gsd_cm int,
  bands int,
  meta jsonb
);

-- Profile data
create table if not exists profile_data (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenant(id),
  line_code text,
  s_m numeric,
  ground_z_m numeric,
  conductor_z_m numeric,
  meta jsonb
);

-- Enable RLS on all tables
alter table tenant enable row level security;
alter table app_user enable row level security;
alter table dataset_catalog enable row level security;
alter table line_asset enable row level security;
alter table tower_asset enable row level security;
alter table span_analysis enable row level security;
alter table dem_surface enable row level security;
alter table profile_data enable row level security;

-- Basic RLS policies (users can only see their tenant's data)
create policy "Users can view own tenant data" on tenant
  for select using (auth.uid() in (select id from app_user where tenant_id = tenant.id));

create policy "Users can view own tenant users" on app_user
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));

create policy "Users can view own tenant datasets" on dataset_catalog
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));

create policy "Users can view own tenant lines" on line_asset
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));

create policy "Users can view own tenant towers" on tower_asset
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));

create policy "Users can view own tenant spans" on span_analysis
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));

create policy "Users can view own tenant DEMs" on dem_surface
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));

create policy "Users can view own tenant profiles" on profile_data
  for select using (tenant_id in (select tenant_id from app_user where id = auth.uid()));