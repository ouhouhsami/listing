-- ── Extensions ──────────────────────────────────────────────────────
create extension if not exists postgis;

-- ── listings ─────────────────────────────────────────────────────────
create table listings (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  user_id         uuid references auth.users(id) on delete cascade,
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

create index listings_geom_idx on listings using gist(geom);

-- ── saved_searches ───────────────────────────────────────────────────
create table saved_searches (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  user_id         uuid references auth.users(id) on delete cascade,
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

-- ── contact_requests ─────────────────────────────────────────────────
create table contact_requests (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  listing_id      uuid references listings(id) on delete cascade,
  buyer_id        uuid references auth.users(id) on delete cascade,
  buyer_email     text not null,
  message         text not null
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table listings enable row level security;
create policy "lecture publique" on listings for select using (status = 'actif');
create policy "vendeur gère ses annonces" on listings for all using (auth.uid() = user_id);

alter table saved_searches enable row level security;
create policy "utilisateur gère ses recherches" on saved_searches for all using (auth.uid() = user_id);

alter table contact_requests enable row level security;
create policy "acheteur crée une demande" on contact_requests for insert with check (auth.uid() = buyer_id);

-- ── Fonction de recherche unifiée avec filtre spatial optionnel ───────
create or replace function search_listings(
  p_zone         jsonb    default null,
  p_type         text     default null,
  p_price_max    integer  default null,
  p_surface_min  float    default null,
  p_rooms_min    integer  default null,
  p_bedrooms_min integer  default null,
  p_has_balcony  boolean  default null,
  p_has_parking  boolean  default null,
  p_has_elevator boolean  default null,
  p_has_garden   boolean  default null,
  p_limit        integer  default 50
)
returns table (
  id            uuid,
  title         text,
  property_type text,
  price         integer,
  surface       float,
  rooms         integer,
  bedrooms      integer,
  dpe           text,
  city          text,
  created_at    timestamptz
)
language sql stable security invoker
as $$
  select id, title, property_type, price, surface, rooms,
         bedrooms, dpe, city, created_at
  from listings
  where status = 'actif'
    and (p_type         is null or property_type = p_type)
    and (p_price_max    is null or price        <= p_price_max)
    and (p_surface_min  is null or surface      >= p_surface_min)
    and (p_rooms_min    is null or rooms        >= p_rooms_min)
    and (p_bedrooms_min is null or bedrooms     >= p_bedrooms_min)
    and (p_has_balcony  is null or has_balcony  = p_has_balcony)
    and (p_has_parking  is null or not p_has_parking or parking != 'aucun')
    and (p_has_elevator is null or has_elevator = p_has_elevator)
    and (p_has_garden   is null or has_garden   = p_has_garden)
    and (p_zone is null or ST_Within(
          geom,
          ST_SetSRID(ST_GeomFromGeoJSON(p_zone::text), 4326)
        ))
  order by created_at desc
  limit least(p_limit, 50);
$$;
