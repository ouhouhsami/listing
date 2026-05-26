-- ── Colonne géométrique générée depuis lat/lng ───────────────────────
alter table listings
  add column geom geometry(Point, 4326)
  generated always as (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) stored;

create index listings_geom_idx on listings using gist(geom);

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
