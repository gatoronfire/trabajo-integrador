-- Etapa 6 · Tabla de turnos
-- Reglas del consultorio aplicadas en la base de datos:
--   * turnos de 40 minutos, de 08:00 a 20:00 (último turno 19:20)
--   * sin sobreturnos: un solo turno por fecha y horario
--   * los turnos no se modifican: solo se crean o se eliminan

create table if not exists public.turnos (
  id               bigint generated always as identity primary key,
  fecha            date not null,
  horario          time not null,
  nombre           text not null,
  apellido         text not null,
  dni              bigint not null references public.pacientes (dni),
  telefono         bigint not null,
  tipo_obra_social text,
  creado_en        timestamptz not null default now(),

  constraint turnos_sin_sobreturno unique (fecha, horario),
  constraint turnos_en_grilla check (
    horario >= time '08:00'
    and horario <= time '19:20'
    and (extract(epoch from horario)::int - 8 * 3600) % (40 * 60) = 0
  )
);

create index if not exists turnos_dni_idx on public.turnos (dni);

-- Los turnos no se pueden modificar, ni siquiera desde el panel de Supabase.
create or replace function public.turnos_no_modificables()
returns trigger language plpgsql as $$
begin
  raise exception 'Los turnos no se pueden modificar. Eliminá el turno y creá uno nuevo.';
end;
$$;

drop trigger if exists turnos_bloquear_update on public.turnos;
create trigger turnos_bloquear_update
  before update on public.turnos
  for each row execute function public.turnos_no_modificables();

alter table public.turnos enable row level security;

-- Acceso TEMPORAL (sin login). No hay política de UPDATE a propósito.
create policy "dev_leer_turnos" on public.turnos
  for select to anon, authenticated using (true);
create policy "dev_crear_turnos" on public.turnos
  for insert to anon, authenticated with check (true);
create policy "dev_eliminar_turnos" on public.turnos
  for delete to anon, authenticated using (true);
