// Utilidades de interfaz compartidas por las vistas.

import { supabase } from "./supabase.js";
import { Paciente } from "./models/Paciente.js";
import { agregarPaciente } from "./store.js";

export const $ = (id) => document.getElementById(id);

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const aEntero = (s) => (/^\d+$/.test(String(s).trim()) ? parseInt(s, 10) : NaN);

/** Traduce un error a un mensaje para la secretaria. */
export function textoDeError(e) {
  if (e && e.code === "42501") return "No tenés permiso para hacer esto. Revisá que hayas iniciado sesión.";
  if (e instanceof Error) return e.message;
  if (e && /fetch/i.test(e.message || "")) return "No hay conexión con la base de datos. Revisá internet y probá de nuevo.";
  return "No se pudo guardar. Probá de nuevo.";
}

export function mostrarBanner(texto) {
  const b = $("banner");
  b.textContent = texto;
  b.hidden = false;
}

/** Bloque con los datos de un paciente o de un turno (tienen los mismos campos). */
export function datosPacienteHTML(p) {
  return `<dl>
    <dt>Nombre</dt><dd>${esc(p.nombre)}</dd>
    <dt>Apellido</dt><dd>${esc(p.apellido)}</dd>
    <dt>DNI</dt><dd>${esc(p.dni)}</dd>
    <dt>Teléfono</dt><dd>${esc(p.telefono)}</dd>
    <dt>Obra social</dt><dd>${p.tipoObraSocial ? esc(p.tipoObraSocial) : "Sin obra social"}</dd>
  </dl>`;
}

/** HTML del formulario de alta de paciente. `px` es un prefijo para los ids. */
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

/** Conecta el formulario: valida, crea el paciente en Supabase y llama a onGuardado(paciente). */
export function conectarFormularioPaciente(px, { onGuardado, onVolver }) {
  if (onVolver) $(px + "Back").onclick = onVolver;
  $(px + "Form").onsubmit = async (e) => {
    e.preventDefault();
    const obraSocial = $(px + "Tipo").value.trim();
    const datos = {
      nombre: $(px + "Nom").value.trim(),
      apellido: $(px + "Ape").value.trim(),
      dni: aEntero($(px + "Dni").value),
      telefono: aEntero($(px + "Tel").value),
      tipoObraSocial: obraSocial || null, // vacío = sin obra social
    };
    $(px + "Ok").disabled = true;
    try {
      const p = await Paciente.crear(supabase, datos);
      agregarPaciente(p);
      await onGuardado(p);
    } catch (err) {
      errorEnFormulario(px, textoDeError(err));
      $(px + "Ok").disabled = false;
    }
  };
}

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
