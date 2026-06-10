-- ── Extensions ──────────────────────────────────────────────────────
create extension if not exists postgis;
create extension if not exists pgcrypto;  -- gen_random_uuid sur vieux Postgres

-- ── users ─────────────────────────────────────────────────────────────
create table users (
  id              uuid default gen_random_uuid() primary key,
  email           text unique not null,
  created_at      timestamptz default now()
);

-- ── listings ─────────────────────────────────────────────────────────
create table listings (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  user_id         uuid references users(id) on delete cascade,
  status          text default 'actif' check (status in ('actif','vendu','suspendu','expire')),
  property_type   text not null check (property_type in ('appartement','maison')),
  title           text,
  address         text not null,
  city            text not null,
  postal_code     text not null,
  lat             float not null,
  lng             float not null,
  geom            geometry(Point, 4326)
                    generated always as (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) stored,
  price           integer not null,
  surface         float not null,
  land_surface    float,
  rooms           integer not null,
  bedrooms        integer not null,
  bathrooms       integer not null,
  floor           integer,
  total_floors    integer,
  dpe             text not null check (dpe in ('A','B','C','D','E','F','G')),
  ges             text not null check (ges in ('A','B','C','D','E','F','G')),
  heating_type    text not null,
  heating_mode    text check (heating_mode in ('collectif','individuel')),
  year_built      integer,
  condition       text,
  has_balcony     boolean default false,
  has_cave        boolean default false,
  parking         text default 'aucun',
  has_elevator    boolean default false,
  has_garden      boolean default false,
  photos          text[] default '{}',
  description     text,
  views           integer default 0
);

create index listings_geom_idx   on listings using gist(geom);
create index listings_status_idx on listings(status);
create index listings_user_idx   on listings(user_id);

-- ── saved_searches ───────────────────────────────────────────────────
create table saved_searches (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  user_id         uuid references users(id) on delete cascade,
  property_type   text not null,
  zone            jsonb,
  price_max       integer,
  surface_min     float,
  rooms_min       integer,
  bedrooms_min    integer,
  has_balcony     boolean,
  has_parking     boolean,
  has_elevator    boolean,
  has_garden      boolean,
  alerts_enabled  boolean default true,
  label           text
);

create index saved_searches_user_idx on saved_searches(user_id);

-- ── contact_requests ─────────────────────────────────────────────────
create table contact_requests (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  listing_id      uuid references listings(id) on delete cascade,
  buyer_id        uuid references users(id) on delete cascade,
  buyer_email     text not null,
  message         text not null
);
