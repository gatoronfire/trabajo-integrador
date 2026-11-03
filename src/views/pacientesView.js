/**
 * Pestaña Pacientes: tabla con buscador, ficha de cada paciente y alta con el botón "Nuevo paciente".
 *
 * La pantalla tiene dos partes:
 *   - izquierda: la tabla de pacientes (renderLista);
 *   - derecha: un panel que muestra la ficha, el formulario de alta o un texto de ayuda (renderPanel).
 *
 * Las funciones render* vuelven a dibujar su parte completa a partir de las
 * variables de estado de este archivo. Para cambiar lo que se ve, se cambia
 * el estado y se llama al render correspondiente.
 */

import { estado, alCambiarPacientes, ordenarPacientes, coincide } from "../store.js";
import { $, esc, datosPacienteHTML, formularioPacienteHTML, conectarFormularioPaciente } from "../ui.js";
import { supabase } from "../supabase.js";
import { Turno } from "../models/Turno.js";
import { fechaCorta } from "../agenda.js";

/* ---------- estado de la vista ---------- */

/** Qué muestra el panel de la derecha: "vacio" (ayuda), "ficha" o "alta". */
let modo = "vacio";
/** DNI del paciente cuya ficha está abierta. */
let seleccionado = null;
/** Mensaje de éxito a mostrar en el panel (por ejemplo, "Paciente guardado"). */
let mensaje = null;
/** Turnos del paciente abierto; null mientras se están cargando. */
let turnosDelPaciente = null;

/** Conecta el buscador y el botón. Se llama una sola vez, al arrancar la app. */
export function iniciarPacientes() {
  $("pacSearch").oninput = renderLista; // filtra mientras se escribe
  $("pacNuevo").onclick = abrirAlta;
  // Si la lista de pacientes cambia (por ejemplo, se cargó desde la base o se creó
  // uno desde la pestaña Turnos), se redibuja la tabla si esta pestaña está visible.
  alCambiarPacientes(() => {
    if (!$("viewPac").hidden) renderLista();
  });
}

/** Dibuja la pestaña completa. Se llama cada vez que se entra a la pestaña. */
export function mostrarPacientes() {
  renderLista();
  renderPanel();
}

/* ---------- tabla ---------- */

/** Dibuja la tabla, filtrada por el texto del buscador, y el contador. */
function renderLista() {
  const q = $("pacSearch").value.trim().toLowerCase();
  const todos = [...estado.pacientes.values()].sort(ordenarPacientes);
  const lista = q ? todos.filter((p) => coincide(p, q)) : todos;

  // Mensaje "Todavía no hay pacientes cargados", solo si la lista está vacía.
  $("pacEmpty").hidden = todos.length > 0;
  // Contador: "12 pacientes" sin búsqueda, "3 de 12 pacientes" con búsqueda.
  $("pacCount").textContent = !todos.length
    ? ""
    : q
    ? `${lista.length} de ${todos.length} pacientes`
    : `${todos.length} paciente${todos.length === 1 ? "" : "s"}`;

  // Una fila por paciente. La fila del paciente abierto se marca con la clase "sel".
  // data-dni guarda el DNI en la fila para saber cuál se tocó.
  $("pacBody").innerHTML = lista.length
    ? lista
        .map(
          (p) => `<tr class="click${modo === "ficha" && seleccionado === p.dni ? " sel" : ""}" data-dni="${p.dni}" tabindex="0">
        <td>${esc(p.nombreCompleto)}</td><td class="mono">${p.dni}</td><td class="mono">${p.telefono}</td>
        <td>${p.tipoObraSocial ? esc(p.tipoObraSocial) : "Sin obra social"}</td></tr>`
        )
        .join("")
    : q
    ? `<tr><td colspan="4" class="empty">No hay pacientes que coincidan con "${esc($("pacSearch").value.trim())}".</td></tr>`
    : "";

  // Cada fila abre la ficha con un clic o con Enter (tabindex="0" permite llegar con Tab).
  $("pacBody").querySelectorAll("tr[data-dni]").forEach((tr) => {
    const abrir = () => {
      mensaje = null;
      abrirFicha(Number(tr.dataset.dni));
    };
    tr.onclick = abrir;
    tr.onkeydown = (e) => e.key === "Enter" && abrir();
  });
}

/* ---------- acciones ---------- */

/** Muestra el formulario de alta en el panel y pone el cursor en "Nombre". */
function abrirAlta() {
  modo = "alta";
  seleccionado = null;
  mensaje = null;
  renderLista(); // quita la marca de la fila que estaba seleccionada
  renderPanel();
  $("pNom").focus();
}

/**
 * Abre la ficha de un paciente y carga sus turnos desde la base.
 * Primero dibuja la ficha con "Cargando turnos…" y después la completa.
 * @param {number} dni
 */
async function abrirFicha(dni) {
  modo = "ficha";
  seleccionado = dni;
  turnosDelPaciente = null;
  renderLista();
  renderPanel();
  try {
    turnosDelPaciente = await Turno.dePaciente(supabase, dni);
  } catch {
    turnosDelPaciente = []; // si falla, se muestra "Sin turnos asignados" en vez de quedar cargando
  }
  // Mientras se esperaba a la base, la secretaria pudo abrir otro paciente:
  // solo se redibuja si sigue abierta la misma ficha.
  if (modo === "ficha" && seleccionado === dni) renderPanel();
}

/* ---------- panel derecho ---------- */

/** Dibuja el panel de la derecha según el modo actual. */
function renderPanel() {
  const P = $("pacPanel");
  const aviso = mensaje ? `<div class="msg ok" style="margin-bottom:12px">${esc(mensaje)}</div>` : "";

  // Modo alta: formulario de paciente nuevo.
  if (modo === "alta") {
    P.innerHTML = `<h2>Nuevo paciente</h2><p class="when">El DNI identifica a cada paciente y no se puede repetir.</p>
      ${formularioPacienteHTML("p", "Guardar paciente")}
      <button class="btn" id="pacCancelar" style="margin-top:10px">Cancelar</button>`;
    conectarFormularioPaciente("p", {
      // Al guardar, se abre directamente la ficha del paciente nuevo con un aviso.
      onGuardado: (nuevo) => {
        mensaje = `Paciente ${nuevo.nombreCompleto} guardado.`;
        abrirFicha(nuevo.dni);
      },
    });
    $("pacCancelar").onclick = () => {
      modo = "vacio";
      mensaje = null;
      renderPanel();
    };
    return;
  }

  // Modo ficha: datos del paciente y sus turnos.
  const p = modo === "ficha" && estado.pacientes.get(seleccionado);
  if (p) {
    const lista =
      turnosDelPaciente === null
        ? `<p class="empty">Cargando turnos…</p>`
        : turnosDelPaciente.length
        ? `<ul>${turnosDelPaciente.map((t) => `<li class="mono">${fechaCorta(t.fecha)} ${t.horario}</li>`).join("")}</ul>`
        : `<p class="empty">Sin turnos asignados.</p>`;
    P.innerHTML = `${aviso}<h2>${esc(p.nombreCompleto)}</h2><p class="when">Ficha del paciente</p>
      ${datosPacienteHTML(p)}
      <div class="hist" style="margin:0">Turnos asignados:${lista}</div>`;
    return;
  }

  // Modo vacío: texto de ayuda.
  P.innerHTML = `${aviso}<h2>Pacientes</h2><p class="empty">Elegí un paciente de la tabla para ver su ficha y sus turnos, o tocá "Nuevo paciente" para dar de alta uno.</p>`;
}
