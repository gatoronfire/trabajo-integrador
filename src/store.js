/**
 * Estado compartido entre las vistas: la lista de pacientes cargada desde Supabase.
 *
 * Las dos pestañas necesitan los pacientes (Turnos para asignarlos, Pacientes
 * para listarlos). En lugar de pedirlos a la base cada vez, se guardan acá y
 * cada vista se suscribe para enterarse cuando la lista cambia (patrón observador).
 */

import { supabase } from "./supabase.js";
import { Paciente } from "./models/Paciente.js";

export const estado = {
  /** @type {Map<number, Paciente>} Pacientes indexados por DNI. */
  pacientes: new Map(),
};

/** Funciones a avisar cuando cambia la lista de pacientes. */
const suscriptores = new Set();

/** Avisa a todas las vistas suscriptas que la lista de pacientes cambió. */
function notificar() {
  suscriptores.forEach((fn) => fn());
}

/**
 * Registra una función que se llama cada vez que cambia la lista de pacientes.
 * @param {() => void} fn
 */
export function alCambiarPacientes(fn) {
  suscriptores.add(fn);
}

/** Trae todos los pacientes de la base y reemplaza la lista en memoria. */
export async function cargarPacientes() {
  const lista = await Paciente.listar(supabase);
  estado.pacientes = new Map(lista.map((p) => [p.dni, p]));
  notificar();
}

/**
 * Agrega a la lista en memoria un paciente recién creado,
 * así aparece en las vistas sin volver a consultar la base.
 * @param {Paciente} p
 */
export function agregarPaciente(p) {
  estado.pacientes.set(p.dni, p);
  notificar();
}

/**
 * Comparador para ordenar pacientes por apellido y nombre.
 * localeCompare con "es" respeta acentos y la ñ.
 */
export const ordenarPacientes = (a, b) =>
  (a.apellido + " " + a.nombre).localeCompare(b.apellido + " " + b.nombre, "es");

/**
 * Indica si un paciente coincide con el texto buscado.
 * Se arma un texto con "apellido nombre nombre apellido dni" para que
 * la búsqueda funcione en cualquier orden ("Pérez Juan" o "Juan Pérez") y por DNI.
 * @param {Paciente} p
 * @param {string} texto Búsqueda ya pasada a minúsculas.
 */
export const coincide = (p, texto) =>
  (p.apellido + " " + p.nombre + " " + p.nombre + " " + p.apellido + " " + p.dni).toLowerCase().includes(texto);
