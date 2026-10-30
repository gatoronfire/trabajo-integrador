import "./style.css";
import { $, mostrarBanner, textoDeError } from "./ui.js";
import { cargarPacientes } from "./store.js";
import { iniciarPacientes, mostrarPacientes } from "./views/pacientesView.js";
import { iniciarAgenda, mostrarAgenda } from "./views/agendaView.js";
import { requerirSesion } from "./views/loginView.js";

/* ---------- pestañas ---------- */
function mostrarPestana(agenda) {
  $("tabAgenda").setAttribute("aria-selected", agenda);
  $("viewAgenda").hidden = !agenda;
  $("tabPac").setAttribute("aria-selected", !agenda);
  $("viewPac").hidden = agenda;
  if (agenda) mostrarAgenda();
  else mostrarPacientes();
}

async function iniciarApp() {
  $("tabAgenda").onclick = () => mostrarPestana(true);
  $("tabPac").onclick = () => mostrarPestana(false);
  iniciarPacientes();
  iniciarAgenda();
  mostrarPestana(true);
  try {
    await cargarPacientes();
  } catch (e) {
    mostrarBanner("No se pudieron cargar los pacientes: " + textoDeError(e));
  }
}

requerirSesion(iniciarApp);
