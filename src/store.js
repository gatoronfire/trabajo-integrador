// Estado compartido entre las vistas: la lista de pacientes cargada desde Supabase.

import { supabase } from "./supabase.js";
import { Paciente } from "./models/Paciente.js";

export const estado = {
  pacientes: new Map(), // dni → Paciente
};

const suscriptores = new Set();

/** Registra una función que se llama cada vez que cambia la lista de pacientes. */
export function alCambiarPacientes(fn) {
  suscriptores.add(fn);
}

export async function cargarPacientes() {
  const lista = await Paciente.listar(supabase);
  estado.pacientes = new Map(lista.map((p) => [p.dni, p]));
  suscriptores.forEach((fn) => fn());
}

export function agregarPaciente(p) {
  estado.pacientes.set(p.dni, p);
  suscriptores.forEach((fn) => fn());
}

export const ordenarPacientes = (a, b) =>
  (a.apellido + " " + a.nombre).localeCompare(b.apellido + " " + b.nombre, "es");

export const coincide = (p, texto) =>
  (p.apellido + " " + p.nombre + " " + p.nombre + " " + p.apellido + " " + p.dni).toLowerCase().includes(texto);
