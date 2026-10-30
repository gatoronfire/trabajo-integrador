-- Etapa 4 · Tabla de pacientes
-- Ejecutar en Supabase: SQL Editor → New query → pegar y Run.

create table if not exists public.pacientes (
  dni              bigint primary key
                   check (dni between 1000000 and 999999999),
  nombre           text not null check (length(trim(nombre)) > 0),
  apellido         text not null check (length(trim(apellido)) > 0),
  telefono         bigint not null
                   check (telefono between 1000000 and 999999999999999),
  tipo_obra_social text,             -- null = sin obra social
  creado_en        timestamptz not null default now()
);

-- Row Level Security: sin políticas, nadie puede leer ni escribir.
alter table public.pacientes enable row level security;

-- Acceso TEMPORAL mientras desarrollamos (todavía no hay login).
-- En la etapa 10 (03_seguridad.sql) se reemplaza por acceso solo con sesión iniciada.
create policy "dev_leer_pacientes" on public.pacientes
  for select to anon, authenticated using (true);
create policy "dev_crear_pacientes" on public.pacientes
  for insert to anon, authenticated with check (true);
