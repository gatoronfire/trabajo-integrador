// Pestaña Pacientes: tabla con buscador, ficha de cada paciente y alta con el botón "Nuevo paciente".

import { estado, alCambiarPacientes, ordenarPacientes, coincide } from "../store.js";
import { $, esc, datosPacienteHTML, formularioPacienteHTML, conectarFormularioPaciente } from "../ui.js";
import { supabase } from "../supabase.js";
import { Turno } from "../models/Turno.js";
import { fechaCorta } from "../agenda.js";

// Qué muestra el panel de la derecha: "vacio", "ficha" o "alta".
let modo = "vacio";
let seleccionado = null; // dni del paciente abierto
let mensaje = null;
let turnosDelPaciente = null;

export function iniciarPacientes() {
  $("pacSearch").oninput = renderLista;
  $("pacNuevo").onclick = abrirAlta;
  alCambiarPacientes(() => {
    if (!$("viewPac").hidden) renderLista();
  });
}

export function mostrarPacientes() {
  renderLista();
  renderPanel();
}

function renderLista() {
  const q = $("pacSearch").value.trim().toLowerCase();
  const todos = [...estado.pacientes.values()].sort(ordenarPacientes);
  const lista = q ? todos.filter((p) => coincide(p, q)) : todos;

  $("pacEmpty").hidden = todos.length > 0;
  $("pacCount").textContent = !todos.length
    ? ""
    : q
    ? `${lista.length} de ${todos.length} pacientes`
    : `${todos.length} paciente${todos.length === 1 ? "" : "s"}`;

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

  $("pacBody").querySelectorAll("tr[data-dni]").forEach((tr) => {
    const abrir = () => {
      mensaje = null;
      abrirFicha(Number(tr.dataset.dni));
    };
    tr.onclick = abrir;
    tr.onkeydown = (e) => e.key === "Enter" && abrir();
  });
}

function abrirAlta() {
  modo = "alta";
  seleccionado = null;
  mensaje = null;
  renderLista();
  renderPanel();
  $("pNom").focus();
}

async function abrirFicha(dni) {
  modo = "ficha";
  seleccionado = dni;
  turnosDelPaciente = null;
  renderLista();
  renderPanel();
  try {
    turnosDelPaciente = await Turno.dePaciente(supabase, dni);
  } catch {
    turnosDelPaciente = [];
  }
  if (modo === "ficha" && seleccionado === dni) renderPanel();
}

function renderPanel() {
  const P = $("pacPanel");
  const aviso = mensaje ? `<div class="msg ok" style="margin-bottom:12px">${esc(mensaje)}</div>` : "";

  if (modo === "alta") {
    P.innerHTML = `<h2>Nuevo paciente</h2><p class="when">El DNI identifica a cada paciente y no se puede repetir.</p>
      ${formularioPacienteHTML("p", "Guardar paciente")}
      <button class="btn" id="pacCancelar" style="margin-top:10px">Cancelar</button>`;
    conectarFormularioPaciente("p", {
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

  P.innerHTML = `${aviso}<h2>Pacientes</h2><p class="empty">Elegí un paciente de la tabla para ver su ficha y sus turnos, o tocá "Nuevo paciente" para dar de alta uno.</p>`;
}
