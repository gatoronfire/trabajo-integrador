/**
 * Cliente de Supabase compartido por toda la app.
 *
 * Vite lee el archivo .env y expone en import.meta.env solo las variables
 * que empiezan con VITE_. Esas variables quedan visibles en el navegador,
 * por eso acá va la clave pública "anon" y nunca la "service_role".
 * La seguridad real la ponen las políticas de la base (supabase/03_seguridad.sql).
 */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si falta el .env, se corta el arranque con un mensaje claro en la consola
// en lugar de fallar más adelante con errores de red difíciles de entender.
if (!url || !anonKey) {
  throw new Error(
    "Faltan las variables de entorno de Supabase. Copiá .env.example como .env y completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, anonKey);
