-- Etapa 11 · Tiempo real
-- Publica los cambios de la tabla turnos para que la agenda se actualice sola
-- cuando otro puesto crea o elimina un turno.

alter publication supabase_realtime add table public.turnos;
