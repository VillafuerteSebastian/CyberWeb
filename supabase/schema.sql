-- ============================================================================
-- CyberWeb — Esquema Supabase
-- Ejecutar una sola vez en el SQL Editor de tu proyecto Supabase.
-- Reemplaza por completo el backend REST anterior (productos, categorías,
-- descuentos, órdenes, usuarios) sin cambiar la lógica de negocio existente.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (extiende auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  cedula text,
  nombre_completo text,
  correo text,
  telefono text,
  direcciones jsonb not null default '[]'::jsonb,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. CATEGORIAS
-- ----------------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nombre_categoria text not null,
  subcategoria text,
  nombre_subcategoria text,
  tipo text,
  nombre_tipo text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categorias_categoria_idx on public.categorias (categoria);
create index if not exists categorias_subcategoria_idx on public.categorias (categoria, subcategoria);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTOS
-- ----------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text default '',
  precio numeric(12, 2) not null default 0,
  precio_oferta numeric(12, 2),
  categoria text,
  marca text default 'N/A',
  tipos jsonb not null default '[]'::jsonb,
  stock integer not null default 0,
  image text,
  images jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  bullets jsonb not null default '[]'::jsonb,
  variantes jsonb not null default '[]'::jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists productos_categoria_idx on public.productos (categoria);

-- Si la tabla ya existía de una corrida anterior de este script (antes de que
-- existieran estas columnas), agrégalas sin tocar filas existentes.
alter table public.productos add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.productos add column if not exists precio_oferta numeric(12, 2);

-- ----------------------------------------------------------------------------
-- 4. DESCUENTOS
-- ----------------------------------------------------------------------------
create table if not exists public.descuentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  tipo_descuento text not null check (tipo_descuento in ('porcentaje', 'monto_fijo')),
  valor_descuento numeric(12, 2) not null,
  producto_ids uuid[] default '{}',
  usos_maximos integer,
  usos_count integer not null default 0,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. ORDENES + ORDEN_ITEMS
-- ----------------------------------------------------------------------------
create table if not exists public.ordenes (
  id uuid primary key default gen_random_uuid(),
  order_number bigserial unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text,
  customer_email text,
  phone text,
  address text,
  delivery_method text,
  zona_entrega text,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'SHIPPED', 'CANCELLED')),
  motivo text,
  shipping_cost numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orden_items (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes (id) on delete cascade,
  product_id uuid references public.productos (id),
  nombre text not null,
  precio_unitario numeric(12, 2) not null default 0,
  cantidad integer not null default 1,
  subtotal numeric(12, 2) not null default 0,
  available boolean
);

create index if not exists ordenes_user_id_idx on public.ordenes (user_id);
create index if not exists orden_items_orden_id_idx on public.orden_items (orden_id);

-- ----------------------------------------------------------------------------
-- 6. Trigger: crear profile automáticamente al registrarse
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, correo, cedula, nombre_completo, telefono, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'cedula', ''),
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', ''),
    coalesce(new.raw_user_meta_data ->> 'telefono', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. Helper is_admin() — evita recursión de RLS sobre profiles
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 8. RPC create_order — calcula precios en servidor, inserta orden + items
-- ----------------------------------------------------------------------------
create or replace function public.create_order(
  items jsonb,               -- [{ "product_id": "uuid", "cantidad": 2 }, ...]
  delivery_method text,
  zona_entrega text,
  address text,
  shipping_cost numeric
)
returns table (order_id uuid, order_number bigint, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_customer_name text;
  v_customer_email text;
  v_customer_phone text;
  item jsonb;
  v_product record;
  v_item_subtotal numeric;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear una orden';
  end if;

  select nombre_completo, correo, telefono
    into v_customer_name, v_customer_email, v_customer_phone
  from public.profiles where id = v_user_id;

  insert into public.ordenes (user_id, customer_name, customer_email, phone, delivery_method, zona_entrega, address, shipping_cost, subtotal, total)
  values (v_user_id, v_customer_name, v_customer_email, v_customer_phone, delivery_method, zona_entrega, address, coalesce(shipping_cost, 0), 0, 0)
  returning id, ordenes.order_number into v_order_id, v_order_number;

  for item in select * from jsonb_array_elements(items)
  loop
    select id, nombre,
      case
        when precio_oferta is not null and precio_oferta > 0 and precio_oferta < precio
          then precio_oferta
        else precio
      end as precio
    into v_product
    from public.productos
    where id = (item ->> 'product_id')::uuid
      and is_deleted = false
      and available = true;

    if v_product.id is null then
      raise exception 'Producto % no encontrado o no disponible', item ->> 'product_id';
    end if;

    v_item_subtotal := v_product.precio * (item ->> 'cantidad')::integer;
    v_subtotal := v_subtotal + v_item_subtotal;

    insert into public.orden_items (orden_id, product_id, nombre, precio_unitario, cantidad, subtotal)
    values (v_order_id, v_product.id, v_product.nombre, v_product.precio, (item ->> 'cantidad')::integer, v_item_subtotal);
  end loop;

  v_total := v_subtotal + coalesce(shipping_cost, 0);

  update public.ordenes
    set subtotal = v_subtotal, total = v_total
    where id = v_order_id;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.descuentos enable row level security;
alter table public.ordenes enable row level security;
alter table public.orden_items enable row level security;

-- profiles: dueño lee/edita su propia fila; admin lee todas
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Blinda "role": RLS por sí sola no puede comparar NEW vs OLD, así que un
-- usuario podría hacer UPDATE profiles SET role='admin' WHERE id=auth.uid()
-- y la policy de arriba (solo valida id = auth.uid()) lo permitiría.
-- Este trigger bloquea cualquier cambio de role hecho por alguien que no
-- sea ya admin (mass assignment / BOPLA — OWASP API3:2023).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null en conexiones con privilegios elevados (SQL Editor,
  -- service_role) — esas quedan fuera del check a propósito, para no romper
  -- la promoción manual de admin documentada al final de este archivo.
  -- Solo bloquea el cambio cuando lo hace un usuario autenticado normal
  -- (vía PostgREST/anon-authenticated) que todavía no es admin.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'No tienes permiso para cambiar el rol de este perfil';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- categorias: lectura pública, escritura solo admin
drop policy if exists "categorias_select_public" on public.categorias;
create policy "categorias_select_public" on public.categorias
  for select using (true);

drop policy if exists "categorias_write_admin" on public.categorias;
create policy "categorias_write_admin" on public.categorias
  for all using (public.is_admin()) with check (public.is_admin());

-- productos: lectura pública, escritura solo admin
drop policy if exists "productos_select_public" on public.productos;
create policy "productos_select_public" on public.productos
  for select using (true);

drop policy if exists "productos_write_admin" on public.productos;
create policy "productos_write_admin" on public.productos
  for all using (public.is_admin()) with check (public.is_admin());

-- descuentos: lectura pública, escritura solo admin
drop policy if exists "descuentos_select_public" on public.descuentos;
create policy "descuentos_select_public" on public.descuentos
  for select using (true);

drop policy if exists "descuentos_write_admin" on public.descuentos;
create policy "descuentos_write_admin" on public.descuentos
  for all using (public.is_admin()) with check (public.is_admin());

-- ordenes: dueño o admin leen; dueño inserta las suyas; solo admin actualiza estado
drop policy if exists "ordenes_select_own_or_admin" on public.ordenes;
create policy "ordenes_select_own_or_admin" on public.ordenes
  for select using (user_id = auth.uid() or public.is_admin());

-- Sin policy de INSERT a propósito: crear órdenes SIEMPRE pasa por el RPC
-- create_order (security definer, bypassa RLS), que calcula precios en el
-- servidor. Una policy "user_id = auth.uid()" aquí permitiría a cualquier
-- usuario insertar una orden directa con status/payment_status/total
-- arbitrarios (p. ej. payment_status='PAID', total=0) — mass assignment /
-- fraude, ya que el resto de columnas queda sin validar (OWASP API3:2023).
drop policy if exists "ordenes_insert_own" on public.ordenes;

drop policy if exists "ordenes_update_admin" on public.ordenes;
create policy "ordenes_update_admin" on public.ordenes
  for update using (public.is_admin()) with check (public.is_admin());

-- orden_items: visibles si la orden es propia o eres admin; solo admin actualiza disponibilidad
drop policy if exists "orden_items_select_own_or_admin" on public.orden_items;
create policy "orden_items_select_own_or_admin" on public.orden_items
  for select using (
    exists (select 1 from public.ordenes o where o.id = orden_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "orden_items_update_admin" on public.orden_items;
create policy "orden_items_update_admin" on public.orden_items
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- STORAGE — bucket product-images
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ============================================================================
-- BACKFILL: crea el perfil de cualquier usuario que ya exista en auth.users
-- pero que no tenga fila en public.profiles (por ejemplo, si te registraste
-- antes de que el trigger on_auth_user_created quedara creado). Es seguro
-- volver a correr esto las veces que quieras.
-- ============================================================================
insert into public.profiles (id, correo, cedula, nombre_completo, telefono, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'cedula', ''),
  coalesce(u.raw_user_meta_data ->> 'nombre_completo', ''),
  coalesce(u.raw_user_meta_data ->> 'telefono', ''),
  'user'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ============================================================================
-- BACKFILL: completa el teléfono de pedidos ya creados antes de que
-- create_order lo guardara (bug: no se estaba copiando desde el perfil).
-- Solo toca pedidos con phone vacío/nulo. Seguro de re-correr.
-- ============================================================================
update public.ordenes o
set phone = p.telefono
from public.profiles p
where p.id = o.user_id
  and (o.phone is null or o.phone = '')
  and p.telefono is not null
  and p.telefono <> '';

-- ============================================================================
-- BACKFILL: crea la sección "General" para categorías que ya existen pero
-- todavía no tienen ninguna subcategoría real (por ejemplo, si las creaste
-- antes de que el admin las generara automáticamente). Seguro de re-correr.
-- ============================================================================
insert into public.categorias (categoria, nombre_categoria, subcategoria, nombre_subcategoria)
select c.categoria, c.nombre_categoria, 'general', 'General'
from public.categorias c
where c.subcategoria is null
  and c.tipo is null
  and c.is_deleted = false
  and not exists (
    select 1 from public.categorias s
    where s.categoria = c.categoria
      and s.subcategoria is not null
      and s.is_deleted = false
  );

-- ============================================================================
-- ÚLTIMO PASO MANUAL: promover tu primer usuario administrador
-- 1) Regístrate normalmente desde la app (crea tu auth.users; el trigger o el
--    backfill de arriba crean tu fila en profiles).
-- 2) Busca tu uuid: select id, correo from public.profiles;
-- 3) Ejecuta:
--    update public.profiles set role = 'admin' where id = '<TU-UUID-AQUI>';
-- ============================================================================
