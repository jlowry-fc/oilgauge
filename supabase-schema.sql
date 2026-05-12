-- ============================================
-- OilGauge Pro — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. TENANTS
create table tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- 2. USERS (extends Supabase auth.users)
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid not null references tenants(id),
  full_name  text not null,
  role       text not null default 'owner' check (role in ('owner','pumper')),
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- 3. LEASES
create table leases (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id),
  name       text not null,
  state      text,
  county     text,
  notes      text,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- 4. TANKS
create table tanks (
  id             uuid primary key default gen_random_uuid(),
  lease_id       uuid not null references leases(id),
  tenant_id      uuid not null references tenants(id),
  name           text not null default 'Tank 1',
  capacity_bbls  numeric(10,2) not null,
  bbls_per_inch  numeric(8,4) not null,
  is_active      boolean default true,
  is_primary     boolean default true,
  notes          text,
  created_at     timestamptz default now()
);

-- 5. GAUGE READINGS
create table gauge_readings (
  id               uuid primary key default gen_random_uuid(),
  tank_id          uuid not null references tanks(id),
  lease_id         uuid not null references leases(id),
  tenant_id        uuid not null references tenants(id),
  pumper_id        uuid not null references users(id),

  -- Measurement
  feet             integer not null check (feet >= 0),
  inches           integer not null check (inches >= 0 and inches < 12),
  inch_fraction    numeric(4,3) not null default 0,
  bbls_on_hand     numeric(10,2),

  -- Dates
  reading_date     timestamptz not null,
  submitted_at     timestamptz default now(),

  -- Classification
  reading_type     text not null default 'normal'
                   check (reading_type in ('normal','oil_sold','transferred','bottom_pulled','correction','other')),
  comments         text,

  -- Run ticket (oil sold)
  ticket_number    text,
  purchaser_name   text,
  bbls_sold        numeric(10,2),
  ticket_date      date,

  -- Production calculations (normal readings only)
  prev_reading_id  uuid references gauge_readings(id),
  bbls_since_last  numeric(10,2),
  days_since_last  numeric(8,2),
  bbls_per_day     numeric(8,3),

  created_at       timestamptz default now()
);

-- 6. PUMPER LEASE ASSIGNMENTS (for future pumper accounts)
create table pumper_lease_assignments (
  pumper_id   uuid not null references users(id),
  lease_id    uuid not null references leases(id),
  assigned_at timestamptz default now(),
  primary key (pumper_id, lease_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table tenants               enable row level security;
alter table users                 enable row level security;
alter table leases                enable row level security;
alter table tanks                 enable row level security;
alter table gauge_readings        enable row level security;
alter table pumper_lease_assignments enable row level security;

-- Helper: get current user's tenant_id
create or replace function get_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from users where id = auth.uid()
$$;

-- TENANTS: users can see their own tenant
create policy "tenant_select" on tenants for select
  using (id = get_tenant_id());

-- USERS: see users in same tenant
create policy "users_select" on users for select
  using (tenant_id = get_tenant_id());
create policy "users_insert" on users for insert
  with check (tenant_id = get_tenant_id());
create policy "users_update" on users for update
  using (tenant_id = get_tenant_id());

-- LEASES
create policy "leases_select" on leases for select
  using (tenant_id = get_tenant_id());
create policy "leases_insert" on leases for insert
  with check (tenant_id = get_tenant_id());
create policy "leases_update" on leases for update
  using (tenant_id = get_tenant_id());

-- TANKS
create policy "tanks_select" on tanks for select
  using (tenant_id = get_tenant_id());
create policy "tanks_insert" on tanks for insert
  with check (tenant_id = get_tenant_id());
create policy "tanks_update" on tanks for update
  using (tenant_id = get_tenant_id());

-- GAUGE READINGS
create policy "readings_select" on gauge_readings for select
  using (tenant_id = get_tenant_id());
create policy "readings_insert" on gauge_readings for insert
  with check (tenant_id = get_tenant_id());
create policy "readings_update" on gauge_readings for update
  using (tenant_id = get_tenant_id() and pumper_id = auth.uid());

-- PUMPER ASSIGNMENTS
create policy "assignments_select" on pumper_lease_assignments for select
  using (exists (select 1 from users where id = auth.uid() and tenant_id = get_tenant_id()));

-- ============================================
-- TRIGGER: auto-create user profile on signup
-- ============================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_tenant_id uuid;
begin
  -- Create a new tenant for this owner
  insert into tenants (name)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'My Operation'))
  returning id into new_tenant_id;

  -- Create the user profile
  insert into users (id, tenant_id, full_name, role)
  values (
    new.id,
    new_tenant_id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'owner'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
