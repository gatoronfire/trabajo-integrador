/**
 * Pestaña Turnos: grilla del día (18 turnos de 40 minutos) y panel de detalle.
 *
 * La pantalla tiene dos partes:
 *   - izquierda: la grilla con los horarios del día elegido (renderGrilla);
 *   - derecha: un panel que cambia según el horario seleccionado (renderPanel):
 *       · turno asignado → datos del turno y botón "Eliminar turno";
 *       · horario libre  → buscador para asignar un paciente o alta de paciente nuevo;
 *       · horario pasado → aviso de que no se puede asignar.
 *
 * Las funciones render* vuelven a dibujar su parte completa a partir de las
 * variables de estado de este archivo.
 */

import { supabase } from "../supabase.js";
import { Turno } from "../models/Turno.js";
import {
  CANTIDAD, DURACION, horariosDelDia, minutosAHora, fechaISO, parseFecha, esPasado, fechaLarga, fechaCorta,
} from "../agenda.js";
import { $, esc, textoDeError, mostrarBanner, datosPacienteHTML } from "../ui.js";
import { estado, alCambiarPacientes, ordenarPacientes, coincide } from "../store.js";
import { formularioPacienteHTML, conectarFormularioPaciente } from "../ui.js";

/* ---------- estado de la vista ---------- */

/** Día que se está mostrando, "AAAA-MM-DD". Arranca en hoy. */
let fecha = fechaISO(new Date());
/** Horario seleccionado en la grilla, en minutos (null si no hay ninguno). */
let seleccion = null;
/** @type {Map<string, Turno>} Turnos del día, indexados por horario "HH:MM". */
let turnos = new Map();
/** Estado del panel derecho; se reinicia al cambiar de horario o de día. */
let ui = nuevoEstadoPanel();

/**
 * Estado inicial del panel derecho:
 *   msg           → mensaje a mostrar ({tipo: "ok" | "err", texto})
 *   confirmar     → si se está pidiendo confirmación para eliminar
 *   busqueda      → texto escrito en el buscador de pacientes
 *   elegido       → DNI del paciente elegido para asignar
 *   pacienteNuevo → si se está mostrando el formulario de alta
 */
function nuevoEstadoPanel() {
  return { msg: null, confirmar: false, busqueda: "", elegido: null, pacienteNuevo: false };
}

/** Conecta los controles de fecha y carga el día de hoy. Se llama una sola vez. */
export function iniciarAgenda() {
  $("dateInput").value = fecha;
  $("dateInput").onchange = (e) => e.target.value && cambiarFecha(e.target.value);
  $("prevDay").onclick = () => moverDia(-1);
  $("nextDay").onclick = () => moverDia(1);
  $("todayBtn").onclick = () => cambiarFecha(fechaISO(new Date()));
  // Si se crea un paciente, el buscador del panel tiene que poder encontrarlo.
  alCambiarPacientes(() => {
    if (seleccion !== null && panelLibre()) renderPanel();
  });
  escucharCambios();
  // Cada minuto se redibuja la grilla para que los horarios que van pasando se marquen como "Pasado".
  setInterval(renderGrilla, 60000);
  cargarDia();
}

/** Dibuja la pestaña completa. Se llama cada vez que se entra a la pestaña. */
export function mostrarAgenda() {
  renderGrilla();
  renderPanel();
}

/* ---------- cambio de día ---------- */

/** Avanza o retrocede días. @param {number} delta -1 para ayer, 1 para mañana. */
function moverDia(delta) {
  const d = parseFecha(fecha);
  d.setDate(d.getDate() + delta); // Date ajusta solo los cambios de mes y de año
  cambiarFecha(fechaISO(d));
}

/** Muestra otro día: limpia la selección y pide los turnos de esa fecha. */
function cambiarFecha(f) {
  fecha = f;
  seleccion = null;
  ui = nuevoEstadoPanel();
  $("dateInput").value = f;
  turnos = new Map(); // la grilla se ve vacía hasta que llegan los turnos del nuevo día
  renderGrilla();
  renderPanel();
  cargarDia();
}

/** Trae de la base los turnos del día que se está mostrando. */
async function cargarDia() {
  const pedida = fecha;
  try {
    const lista = await Turno.delDia(supabase, pedida);
    // Si mientras se esperaba la respuesta la secretaria cambió de día,
    // se descarta este resultado para no mostrar turnos de otra fecha.
    if (pedida !== fecha) return;
    turnos = new Map(lista.map((t) => [t.horario, t]));
    renderGrilla();
    if (panelLibre()) renderPanel();
  } catch (e) {
    mostrarBanner("No se pudieron cargar los turnos: " + textoDeError(e));
  }
}

/**
 * Escucha en tiempo real los turnos que crean o eliminan otros puestos
 * (requiere supabase/04_realtime.sql). Ante cualquier cambio en la tabla
 * se vuelven a pedir los turnos del día.
 */
function escucharCambios() {
  supabase
    .channel("turnos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "turnos" }, () => cargarDia())
    .subscribe();
}

/* ---------- grilla ---------- */

/** Dibuja los 18 horarios del día con su estado: Asignado, Libre o Pasado. */
function renderGrilla() {
  $("dayName").textContent = fechaLarga(fecha);
  const box = $("slots");
  box.innerHTML = "";
  let ocupados = 0;
  for (const m of horariosDelDia()) {
    const t = turnos.get(minutosAHora(m));
    const pasado = esPasado(fecha, m);
    if (t) ocupados++;
    // Cada horario es un botón; las clases definen el color (ver style.css).
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
      renderGrilla(); // para marcar el horario seleccionado
      renderPanel();
    };
    box.appendChild(b);
  }
  // Resumen arriba de la grilla.
  $("cntBusy").textContent = ocupados;
  $("cntFree").textContent = CANTIDAD - ocupados;
}

/**
 * Indica si se puede redibujar el panel sin molestar.
 * Si la secretaria está escribiendo en el panel (buscador o formulario),
 * redibujarlo le borraría lo que escribió o le sacaría el cursor.
 */
function panelLibre() {
  const a = document.activeElement;
  return !ui.pacienteNuevo && !(a && a.tagName === "INPUT" && $("panel").contains(a));
}

/* ---------- panel ---------- */

/** Dibuja el panel derecho según el horario seleccionado. */
function renderPanel() {
  const P = $("panel");
  // Sin horario seleccionado: texto de ayuda.
  if (seleccion === null) {
    P.innerHTML = `<h2>Elegí un horario</h2><p class="empty">Tocá un horario libre para asignarle un paciente, o uno asignado para ver sus datos. Los turnos no se modifican: si hace falta un cambio, se elimina el turno y el horario vuelve a quedar libre.</p>`;
    return;
  }
  const m = seleccion;
  const hora = minutosAHora(m);
  const t = turnos.get(hora);
  const cuando = `<p class="when">${esc(fechaLarga(fecha))} · ${hora} a ${minutosAHora(m + DURACION)}</p>`;
  const msg = ui.msg ? `<div class="msg ${ui.msg.tipo}">${esc(ui.msg.texto)}</div>` : "";

  // Turno asignado: datos y eliminación en dos pasos (botón → confirmación).
  if (t) {
    const acciones = ui.confirmar
      ? `<div class="confirm"><b>¿Eliminar este turno?</b><span>Se borra por completo y el horario queda libre para otro paciente. No se puede deshacer.</span>
          <div class="row"><button class="btn danger solid" id="doDel">Sí, eliminar turno</button><button class="btn" id="noDel">Volver</button></div></div>`
      : `<button class="btn danger" id="askDel">Eliminar turno</button>`;
    P.innerHTML = `<h2>Turno asignado</h2>${cuando}
      <dl><dt>Fecha</dt><dd>${fechaCorta(t.fecha)}</dd><dt>Horario</dt><dd>${t.horario} a ${t.fin}</dd></dl>
      ${datosPacienteHTML(t)}${msg}<div class="stack">${acciones}</div>`;
    // Solo uno de los botones existe a la vez, por eso se pregunta antes de conectarlo.
    if ($("askDel")) $("askDel").onclick = () => { ui.confirmar = true; ui.msg = null; renderPanel(); };
    if ($("noDel")) $("noDel").onclick = () => { ui.confirmar = false; renderPanel(); };
    if ($("doDel")) $("doDel").onclick = () => eliminar(t);
    return;
  }

  // Horario libre pero ya pasado: no se puede asignar.
  if (esPasado(fecha, m)) {
    P.innerHTML = `<h2>Horario pasado</h2>${cuando}<p class="empty">No se pueden asignar turnos en horarios que ya pasaron.</p>${msg}`;
    return;
  }

  // Horario libre: asignar un paciente.
  renderAsignar(P, cuando, msg, hora);
}

/* ---------- asignar turno ---------- */

/**
 * Dibuja el panel para asignar un horario libre. Tiene dos modos:
 *   - buscador de pacientes ya cargados;
 *   - formulario de paciente nuevo, que al guardar asigna el turno en el mismo paso.
 * @param {HTMLElement} P Panel donde dibujar.
 * @param {string} cuando HTML con la fecha y el horario.
 * @param {string} msg HTML del mensaje a mostrar (puede ser vacío).
 * @param {string} hora Horario "HH:MM" a asignar.
 */
function renderAsignar(P, cuando, msg, hora) {
  if (ui.pacienteNuevo) {
    P.innerHTML = `<h2>Paciente nuevo</h2>${cuando}${formularioPacienteHTML("a", "Guardar y asignar turno", true)}`;
    conectarFormularioPaciente("a", {
      // El paciente ya se guardó; ahora se lo elige y se le asigna el horario.
      onGuardado: async (p) => {
        ui.pacienteNuevo = false;
        ui.elegido = p.dni;
        await asignar(hora);
      },
      onVolver: () => { ui.pacienteNuevo = false; ui.msg = null; renderPanel(); },
    });
    return;
  }

  // Búsqueda: solo muestra resultados cuando hay texto, y como máximo 30.
  const todos = [...estado.pacientes.values()];
  const q = ui.busqueda.trim().toLowerCase();
  const resultados = q ? todos.filter((p) => coincide(p, q)).sort(ordenarPacientes).slice(0, 30) : [];
  const elegido = ui.elegido && estado.pacientes.get(ui.elegido);
  // Texto de ayuda debajo del buscador, según el caso.
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

  // Al escribir se redibuja el panel con los resultados nuevos. Como redibujar
  // reemplaza el campo de búsqueda, se le devuelve el foco y la posición del cursor.
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

/**
 * Asigna el paciente elegido al horario y actualiza la grilla.
 * Si falla (por ejemplo, otro puesto ocupó el horario un instante antes),
 * muestra el error y vuelve a cargar el día para reflejar el estado real.
 * @param {string} hora "HH:MM"
 */
async function asignar(hora) {
  const p = estado.pacientes.get(ui.elegido);
  if (!p) return;
  // Se deshabilita el botón para que un doble clic no intente asignar dos veces.
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

/**
 * Elimina el turno (ya confirmado por la secretaria) y deja el horario libre.
 * @param {Turno} t
 */
async function eliminar(t) {
  try {
    await t.eliminar(supabase);
    turnos.delete(t.horario);
    ui = nuevoEstadoPanel();
    ui.msg = { tipo: "ok", texto: "Turno eliminado. El horario quedó libre." };
  } catch (e) {
    ui.msg = { tipo: "err", texto: textoDeError(e) };
    cargarDia(); // por si otro puesto ya lo había eliminado
  }
  renderGrilla();
  renderPanel();
}
