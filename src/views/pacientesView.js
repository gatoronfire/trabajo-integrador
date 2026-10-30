// Pestaña Pacientes: listado con buscador, alta y ficha de cada paciente.

import { estado, alCambiarPacientes, ordenarPacientes, coincide } from "../store.js";
import { $, esc, datosPacienteHTML, formularioPacienteHTML, conectarFormularioPaciente } from "../ui.js";
import { supabase } from "../supabase.js";
import { Turno } from "../models/Turno.js";
import { fechaCorta } from "../agenda.js";

let seleccionado = null; // dni del paciente abierto
let mensaje = null;
let turnosDelPaciente = null;

export function iniciarPacientes() {
  $("pacSearch").oninput = renderLista;
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
  $("pacBody").innerHTML = lista
    .map(
      (p) => `<tr class="click" data-dni="${p.dni}" tabindex="0">
        <td>${esc(p.nombreCompleto)}</td><td class="mono">${p.dni}</td><td class="mono">${p.telefono}</td>
        <td>${p.tipoObraSocial ? esc(p.tipoObraSocial) : "Sin obra social"}</td></tr>`
    )
    .join("");
  $("pacBody").querySelectorAll("tr").forEach((tr) => {
    tr.onclick = () => abrir(Number(tr.dataset.dni));
    tr.onkeydown = (e) => e.key === "Enter" && abrir(Number(tr.dataset.dni));
  });
}

async function abrir(dni) {
  seleccionado = dni;
  mensaje = null;
  turnosDelPaciente = null;
  renderPanel();
  try {
    turnosDelPaciente = await Turno.dePaciente(supabase, dni);
  } catch {
    turnosDelPaciente = [];
  }
  if (seleccionado === dni) renderPanel();
}

function renderPanel() {
  const P = $("pacPanel");
  const p = seleccionado && estado.pacientes.get(seleccionado);
  if (p) {
    let turnosHTML = "";
    turnosHTML =
      turnosDelPaciente === null
        ? `<p class="empty">Cargando turnos…</p>`
        : turnosDelPaciente.length
        ? `<ul>${turnosDelPaciente.map((t) => `<li class="mono">${fechaCorta(t.fecha)} ${t.horario}</li>`).join("")}</ul>`
        : `<p class="empty">Sin turnos asignados.</p>`;
    turnosHTML = `<div class="hist" style="margin:0 0 14px">Turnos asignados:${turnosHTML}</div>`;
    P.innerHTML = `<h2>${esc(p.nombreCompleto)}</h2><p class="when">Ficha del paciente</p>
      ${datosPacienteHTML(p)}${turnosHTML}
      <button class="btn" id="pacNew">Dar de alta otro paciente</button>`;
    $("pacNew").onclick = () => {
      seleccionado = null;
      renderPanel();
    };
    return;
  }
  P.innerHTML = `<h2>Alta de paciente</h2><p class="when">El DNI identifica a cada paciente y no se puede repetir.</p>
    ${mensaje ? `<div class="msg ok" style="margin-bottom:12px">${esc(mensaje)}</div>` : ""}
    ${formularioPacienteHTML("p", "Guardar paciente")}`;
  conectarFormularioPaciente("p", {
    onGuardado: (nuevo) => {
      mensaje = `Paciente ${nuevo.nombreCompleto} guardado.`;
      renderPanel();
    },
  });
}
