/**
 * Punto de entrada de la aplicación.
 *
 * Orden de arranque:
 *   1. requerirSesion() muestra el login si no hay sesión iniciada.
 *   2. Cuando la secretaria ingresa, se ejecuta iniciarApp() una sola vez.
 *   3. iniciarApp() prepara las dos pestañas (Turnos y Pacientes), muestra
 *      Turnos y carga la lista de pacientes desde Supabase.
 */

// Vite procesa este import e inyecta los estilos en la página.
import "./style.css";
import { $, mostrarBanner, textoDeError } from "./ui.js";
import { cargarPacientes } from "./store.js";
import { iniciarPacientes, mostrarPacientes } from "./views/pacientesView.js";
import { iniciarAgenda, mostrarAgenda } from "./views/agendaView.js";
import { requerirSesion } from "./views/loginView.js";

/* ---------- pestañas ---------- */

/**
 * Muestra una pestaña y oculta la otra.
 * @param {boolean} agenda true para Turnos, false para Pacientes.
 */
function mostrarPestana(agenda) {
  // aria-selected marca la pestaña activa (lo usan el CSS y los lectores de pantalla).
  $("tabAgenda").setAttribute("aria-selected", agenda);
  $("viewAgenda").hidden = !agenda;
  $("tabPac").setAttribute("aria-selected", !agenda);
  $("viewPac").hidden = agenda;
  // Se vuelve a dibujar la pestaña visible para que muestre datos actualizados.
  if (agenda) mostrarAgenda();
  else mostrarPacientes();
}

/** Prepara la interfaz una vez que la secretaria inició sesión. */
async function iniciarApp() {
  $("tabAgenda").onclick = () => mostrarPestana(true);
  $("tabPac").onclick = () => mostrarPestana(false);
  iniciarPacientes();
  iniciarAgenda();
  mostrarPestana(true); // la app abre en la pestaña Turnos
  try {
    // Los pacientes se cargan una vez al inicio y quedan en memoria (store.js);
    // las dos pestañas los usan para buscar y mostrar datos.
    await cargarPacientes();
  } catch (e) {
    mostrarBanner("No se pudieron cargar los pacientes: " + textoDeError(e));
  }
}

requerirSesion(iniciarApp);
