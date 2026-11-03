/**
 * Utilidades de interfaz compartidas por las vistas:
 * acceso al DOM, escape de texto, mensajes de error y el formulario de alta de paciente,
 * que se usa en dos lugares (pestaña Pacientes y al asignar un turno).
 */

import { supabase } from "./supabase.js";
import { Paciente } from "./models/Paciente.js";
import { agregarPaciente } from "./store.js";

/** Atajo para buscar un elemento por id. */
export const $ = (id) => document.getElementById(id);

/**
 * Escapa los caracteres especiales de HTML.
 * Todo dato que escribe el usuario pasa por acá antes de insertarse con innerHTML,
 * para que un nombre como "<script>" se muestre como texto y no se ejecute.
 */
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Convierte un texto a entero solo si tiene únicamente dígitos.
 * Devuelve NaN si tiene letras, espacios o guiones; la validación del modelo lo rechaza.
 */
export const aEntero = (s) => (/^\d+$/.test(String(s).trim()) ? parseInt(s, 10) : NaN);

/**
 * Traduce un error a un mensaje entendible para la secretaria.
 * - 42501 es el código de PostgreSQL para "permiso denegado" (políticas de seguridad).
 * - Los Error propios (los que lanzan los modelos) ya traen un mensaje en español.
 */
export function textoDeError(e) {
  if (e && e.code === "42501") return "No tenés permiso para hacer esto. Revisá que hayas iniciado sesión.";
  if (e instanceof Error) return e.message;
  if (e && /fetch/i.test(e.message || "")) return "No hay conexión con la base de datos. Revisá internet y probá de nuevo.";
  return "No se pudo guardar. Probá de nuevo.";
}

/** Muestra un aviso fijo arriba de la página (errores de carga). */
export function mostrarBanner(texto) {
  const b = $("banner");
  b.textContent = texto;
  b.hidden = false;
}

/**
 * HTML con los datos de un paciente.
 * También sirve para un turno, porque el turno guarda los mismos campos del paciente.
 * @param {{nombre:string, apellido:string, dni:number, telefono:number, tipoObraSocial:string|null}} p
 */
export function datosPacienteHTML(p) {
  return `<dl>
    <dt>Nombre</dt><dd>${esc(p.nombre)}</dd>
    <dt>Apellido</dt><dd>${esc(p.apellido)}</dd>
    <dt>DNI</dt><dd>${esc(p.dni)}</dd>
    <dt>Teléfono</dt><dd>${esc(p.telefono)}</dd>
    <dt>Obra social</dt><dd>${p.tipoObraSocial ? esc(p.tipoObraSocial) : "Sin obra social"}</dd>
  </dl>`;
}

/**
 * HTML del formulario de alta de paciente.
 * @param {string} px Prefijo para los ids de los campos. Permite tener el formulario
 *                    en dos vistas sin que se repitan ids ("p" en Pacientes, "a" en Turnos).
 * @param {string} textoBoton Texto del botón de guardar.
 * @param {boolean} conVolver Si agrega el botón "Volver a buscar" (se usa al asignar un turno).
 */
export function formularioPacienteHTML(px, textoBoton, conVolver = false) {
  return `<form id="${px}Form" class="stack" novalidate>
    <div class="row"><label>Nombre<input type="text" id="${px}Nom" autocomplete="off"></label><label>Apellido<input type="text" id="${px}Ape" autocomplete="off"></label></div>
    <div class="row"><label>DNI<input type="text" id="${px}Dni" inputmode="numeric" autocomplete="off"></label><label>Teléfono<input type="tel" id="${px}Tel" inputmode="numeric" autocomplete="off"></label></div>
    <label>Obra social (opcional)<input type="text" id="${px}Tipo" placeholder="Ej.: OSDE, IOMA, PAMI" autocomplete="off"></label>
    <p class="note">DNI y teléfono se cargan solo con números. Si el paciente no tiene obra social, dejá ese campo vacío.</p>
    <div class="row"><button class="btn primary" type="submit" id="${px}Ok">${textoBoton}</button>${
      conVolver ? `<button class="btn" type="button" id="${px}Back">Volver a buscar</button>` : ""
    }</div>
  </form>`;
}

/**
 * Conecta el formulario ya dibujado: al enviarlo lee los campos, crea el paciente
 * en Supabase (Paciente.crear valida los datos) y llama a onGuardado(paciente).
 * Si algo falla, muestra el error dentro del formulario.
 * @param {string} px Mismo prefijo usado en formularioPacienteHTML.
 * @param {{onGuardado: (p: Paciente) => any, onVolver?: () => void}} callbacks
 */
export function conectarFormularioPaciente(px, { onGuardado, onVolver }) {
  if (onVolver) $(px + "Back").onclick = onVolver;
  $(px + "Form").onsubmit = async (e) => {
    e.preventDefault(); // evita que el navegador recargue la página al enviar
    const obraSocial = $(px + "Tipo").value.trim();
    const datos = {
      nombre: $(px + "Nom").value.trim(),
      apellido: $(px + "Ape").value.trim(),
      dni: aEntero($(px + "Dni").value),
      telefono: aEntero($(px + "Tel").value),
      tipoObraSocial: obraSocial || null, // vacío = sin obra social
    };
    // Se deshabilita el botón para que un doble clic no cree el paciente dos veces.
    $(px + "Ok").disabled = true;
    try {
      const p = await Paciente.crear(supabase, datos);
      agregarPaciente(p); // lo suma a la lista en memoria para que aparezca en las vistas
      await onGuardado(p);
    } catch (err) {
      errorEnFormulario(px, textoDeError(err));
      $(px + "Ok").disabled = false;
    }
  };
}

/** Muestra un mensaje de error dentro del formulario, arriba de los botones. */
function errorEnFormulario(px, texto) {
  const f = $(px + "Form");
  let el = f.querySelector(".msg");
  if (!el) {
    el = document.createElement("div");
    f.insertBefore(el, f.lastElementChild);
  }
  el.className = "msg err";
  el.textContent = texto;
}
