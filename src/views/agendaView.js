// Pestaña Turnos: grilla del día (18 turnos de 40 min) y panel de detalle.

import { supabase } from "../supabase.js";
import { Turno } from "../models/Turno.js";
import {
  CANTIDAD, DURACION, horariosDelDia, minutosAHora, fechaISO, parseFecha, esPasado, fechaLarga, fechaCorta,
} from "../agenda.js";
import { $, esc, textoDeError, mostrarBanner, datosPacienteHTML } from "../ui.js";
import { estado, alCambiarPacientes, ordenarPacientes, coincide } from "../store.js";
import { formularioPacienteHTML, conectarFormularioPaciente } from "../ui.js";

let fecha = fechaISO(new Date());
let seleccion = null; // minutos del horario elegido
let turnos = new Map(); // "HH:MM" → Turno
let ui = nuevoEstadoPanel();

function nuevoEstadoPanel() {
  return { msg: null, confirmar: false, busqueda: "", elegido: null, pacienteNuevo: false };
}

export function iniciarAgenda() {
  $("dateInput").value = fecha;
  $("dateInput").onchange = (e) => e.target.value && cambiarFecha(e.target.value);
  $("prevDay").onclick = () => moverDia(-1);
  $("nextDay").onclick = () => moverDia(1);
  $("todayBtn").onclick = () => cambiarFecha(fechaISO(new Date()));
  alCambiarPacientes(() => {
    if (seleccion !== null && panelLibre()) renderPanel();
  });
  setInterval(renderGrilla, 60000); // actualiza qué horarios ya pasaron
  cargarDia();
}

export function mostrarAgenda() {
  renderGrilla();
  renderPanel();
}

function moverDia(delta) {
  const d = parseFecha(fecha);
  d.setDate(d.getDate() + delta);
  cambiarFecha(fechaISO(d));
}

function cambiarFecha(f) {
  fecha = f;
  seleccion = null;
  ui = nuevoEstadoPanel();
  $("dateInput").value = f;
  turnos = new Map();
  renderGrilla();
  renderPanel();
  cargarDia();
}

async function cargarDia() {
  const pedida = fecha;
  try {
    const lista = await Turno.delDia(supabase, pedida);
    if (pedida !== fecha) return; // el usuario ya cambió de día
    turnos = new Map(lista.map((t) => [t.horario, t]));
    renderGrilla();
    if (panelLibre()) renderPanel();
  } catch (e) {
    mostrarBanner("No se pudieron cargar los turnos: " + textoDeError(e));
  }
}

/* ---------- grilla ---------- */
function renderGrilla() {
  $("dayName").textContent = fechaLarga(fecha);
  const box = $("slots");
  box.innerHTML = "";
  let ocupados = 0;
  for (const m of horariosDelDia()) {
    const t = turnos.get(minutosAHora(m));
    const pasado = esPasado(fecha, m);
    if (t) ocupados++;
    const b = document.createElement("button");
    b.className = "slot " + (t ? "busy" : "free") + (pasado && !t ? " past" : "") + (seleccion === m ? " sel" : "");
    const quien = t ? esc(t.apellido + ", " + t.nombre) : pasado ? "Sin turno" : "Libre";
    const pill = t
      ? '<span class="pill busy">Asignado</span>'
      : pasado
      ? '<span class="pill past">Pasado</span>'
      : '<span class="pill free">Libre</span>';
    b.innerHTML = `<span class="t">${minutosAHora(m)}–${minutosAHora(m + DURACION)}</span><span class="who">${quien}</span>${pill}`;
    b.onclick = () => {
      seleccion = m;
      ui = nuevoEstadoPanel();
      renderGrilla();
      renderPanel();
    };
    box.appendChild(b);
  }
  $("cntBusy").textContent = ocupados;
  $("cntFree").textContent = CANTIDAD - ocupados;
}

/** Evita redibujar el panel mientras la secretaria está escribiendo en él. */
function panelLibre() {
  const a = document.activeElement;
  return !ui.pacienteNuevo && !(a && a.tagName === "INPUT" && $("panel").contains(a));
}

/* ---------- panel ---------- */
function renderPanel() {
  const P = $("panel");
  if (seleccion === null) {
    P.innerHTML = `<h2>Elegí un horario</h2><p class="empty">Tocá un horario libre para asignarle un paciente, o uno asignado para ver sus datos. Los turnos no se modifican: si hace falta un cambio, se elimina el turno y el horario vuelve a quedar libre.</p>`;
    return;
  }
  const m = seleccion;
  const hora = minutosAHora(m);
  const t = turnos.get(hora);
  const cuando = `<p class="when">${esc(fechaLarga(fecha))} · ${hora} a ${minutosAHora(m + DURACION)}</p>`;
  const msg = ui.msg ? `<div class="msg ${ui.msg.tipo}">${esc(ui.msg.texto)}</div>` : "";

  if (t) {
    let acciones = "";
    acciones = ui.confirmar
      ? `<div class="confirm"><b>¿Eliminar este turno?</b><span>Se borra por completo y el horario queda libre para otro paciente. No se puede deshacer.</span>
          <div class="row"><button class="btn danger solid" id="doDel">Sí, eliminar turno</button><button class="btn" id="noDel">Volver</button></div></div>`
      : `<button class="btn danger" id="askDel">Eliminar turno</button>`;
    P.innerHTML = `<h2>Turno asignado</h2>${cuando}
      <dl><dt>Fecha</dt><dd>${fechaCorta(t.fecha)}</dd><dt>Horario</dt><dd>${t.horario} a ${t.fin}</dd></dl>
      ${datosPacienteHTML(t)}${msg}<div class="stack">${acciones}</div>`;
    if ($("askDel")) $("askDel").onclick = () => { ui.confirmar = true; ui.msg = null; renderPanel(); };
    if ($("noDel")) $("noDel").onclick = () => { ui.confirmar = false; renderPanel(); };
    if ($("doDel")) $("doDel").onclick = () => eliminar(t);
    return;
  }

  if (esPasado(fecha, m)) {
    P.innerHTML = `<h2>Horario pasado</h2>${cuando}<p class="empty">No se pueden asignar turnos en horarios que ya pasaron.</p>${msg}`;
    return;
  }

  renderAsignar(P, cuando, msg, hora);
}

/* ---------- asignar turno ---------- */
function renderAsignar(P, cuando, msg, hora) {
  if (ui.pacienteNuevo) {
    P.innerHTML = `<h2>Paciente nuevo</h2>${cuando}${formularioPacienteHTML("a", "Guardar y asignar turno", true)}`;
    conectarFormularioPaciente("a", {
      onGuardado: async (p) => {
        ui.pacienteNuevo = false;
        ui.elegido = p.dni;
        await asignar(hora);
      },
      onVolver: () => { ui.pacienteNuevo = false; ui.msg = null; renderPanel(); },
    });
    return;
  }

  const todos = [...estado.pacientes.values()];
  const q = ui.busqueda.trim().toLowerCase();
  const resultados = q ? todos.filter((p) => coincide(p, q)).sort(ordenarPacientes).slice(0, 30) : [];
  const elegido = ui.elegido && estado.pacientes.get(ui.elegido);
  let ayuda = "";
  if (q && !resultados.length) ayuda = `<p class="empty">No hay pacientes que coincidan. Podés darlo de alta con "Paciente nuevo".</p>`;
  else if (!q && !todos.length) ayuda = `<p class="empty">No hay pacientes cargados todavía.</p>`;
  else if (!q) ayuda = `<p class="empty">Escribí para buscar entre ${todos.length} paciente${todos.length === 1 ? "" : "s"}.</p>`;

  P.innerHTML = `<h2>Asignar turno</h2>${cuando}
    <div class="stack">
      <label>Buscar paciente<input type="search" id="aq" placeholder="Apellido, nombre o DNI" value="${esc(ui.busqueda)}" autocomplete="off"></label>
      <div class="results">${resultados
        .map((p) => `<button class="res${ui.elegido === p.dni ? " sel" : ""}" data-dni="${p.dni}"><span>${esc(p.nombreCompleto)}</span><span class="d">${p.dni}</span></button>`)
        .join("")}${ayuda}</div>
      ${elegido ? datosPacienteHTML(elegido) : ""}
      ${msg}
      <div class="row"><button class="btn primary" id="doAssign" ${elegido ? "" : "disabled"}>Asignar turno</button><button class="btn" id="newPac">Paciente nuevo</button></div>
    </div>`;

  $("aq").oninput = (e) => {
    ui.busqueda = e.target.value;
    ui.msg = null;
    const pos = e.target.selectionStart;
    renderPanel();
    $("aq").focus();
    $("aq").setSelectionRange(pos, pos);
  };
  P.querySelectorAll(".res").forEach((b) => (b.onclick = () => { ui.elegido = Number(b.dataset.dni); ui.msg = null; renderPanel(); }));
  $("newPac").onclick = () => { ui.pacienteNuevo = true; ui.msg = null; renderPanel(); };
  $("doAssign").onclick = () => asignar(hora);
}

async function asignar(hora) {
  const p = estado.pacientes.get(ui.elegido);
  if (!p) return;
  if ($("doAssign")) $("doAssign").disabled = true;
  try {
    const t = await Turno.asignar(supabase, p, fecha, hora);
    turnos.set(t.horario, t);
    ui = nuevoEstadoPanel();
    ui.msg = { tipo: "ok", texto: "Turno asignado a " + p.nombreCompleto + "." };
  } catch (e) {
    ui.msg = { tipo: "err", texto: textoDeError(e) };
    cargarDia(); // por si otro puesto ocupó el horario
  }
  renderGrilla();
  renderPanel();
}

/* ---------- eliminar turno ---------- */
async function eliminar(t) {
  try {
    await t.eliminar(supabase);
    turnos.delete(t.horario);
    ui = nuevoEstadoPanel();
    ui.msg = { tipo: "ok", texto: "Turno eliminado. El horario quedó libre." };
  } catch (e) {
    ui.msg = { tipo: "err", texto: textoDeError(e) };
    cargarDia();
  }
  renderGrilla();
  renderPanel();
}
