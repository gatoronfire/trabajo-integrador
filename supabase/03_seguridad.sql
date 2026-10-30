-- Etapa 10 · Solo usuarios con sesión iniciada acceden a los datos
-- Antes de correr esto, creá el usuario de la secretaría en
-- Authentication → Users → Add user (email + contraseña).

-- Quitar el acceso temporal de desarrollo
drop policy if exists "dev_leer_pacientes"  on public.pacientes;
drop policy if exists "dev_crear_pacientes" on public.pacientes;
drop policy if exists "dev_leer_turnos"     on public.turnos;
drop policy if exists "dev_crear_turnos"    on public.turnos;
drop policy if exists "dev_eliminar_turnos" on public.turnos;

-- Pacientes: leer y dar de alta
create policy "leer_pacientes" on public.pacientes
  for select to authenticated using (true);
create policy "crear_pacientes" on public.pacientes
  for insert to authenticated with check (true);

-- Turnos: leer, crear y eliminar. Sin UPDATE: los turnos no se modifican.
create policy "leer_turnos" on public.turnos
  for select to authenticated using (true);
create policy "crear_turnos" on public.turnos
  for insert to authenticated with check (true);
create policy "eliminar_turnos" on public.turnos
  for delete to authenticated using (true);
