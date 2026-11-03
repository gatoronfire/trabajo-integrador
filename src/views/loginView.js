/**
 * Inicio de sesión de la secretaría con Supabase Auth (email y contraseña).
 * El usuario se crea desde el panel de Supabase: Authentication → Users → Add user.
 *
 * Supabase guarda la sesión en el navegador, así que al recargar la página
 * la secretaria sigue conectada hasta que toca "Salir".
 */

import { supabase } from "../supabase.js";
import { $ } from "../ui.js";

/**
 * Muestra el login si no hay sesión. Cuando hay sesión, muestra la app
 * y llama a onIngreso(usuario) una sola vez.
 * @param {(usuario: object) => void} onIngreso Función que arranca la app.
 */
export async function requerirSesion(onIngreso) {
  // Evita arrancar la app dos veces (Supabase puede avisar varios eventos de sesión).
  let iniciado = false;

  /** Oculta el login, muestra la app y la arranca si todavía no se hizo. */
  const entrar = (usuario) => {
    $("viewLogin").hidden = true;
    $("viewApp").hidden = false;
    $("userEmail").textContent = usuario.email;
    if (!iniciado) {
      iniciado = true;
      onIngreso(usuario);
    }
  };

  // ¿Ya había una sesión guardada de antes?
  const { data } = await supabase.auth.getSession();
  if (data.session) entrar(data.session.user);
  else $("viewLogin").hidden = false;

  // Escucha los cambios de sesión: al ingresar se muestra la app;
  // al salir se recarga la página, que vuelve al login y borra los datos de pantalla.
  supabase.auth.onAuthStateChange((evento, sesion) => {
    if (evento === "SIGNED_OUT") location.reload();
    else if (sesion && !iniciado) entrar(sesion.user);
  });

  $("loginForm").onsubmit = async (e) => {
    e.preventDefault(); // evita que el navegador recargue la página al enviar
    $("loginBtn").disabled = true;
    $("loginMsg").hidden = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: $("loginEmail").value.trim(),
      password: $("loginPass").value,
    });
    // Si sale bien no hace falta hacer nada acá: onAuthStateChange llama a entrar().
    if (error) {
      // No se dice cuál de los dos datos está mal, para no dar pistas a quien pruebe usuarios.
      $("loginMsg").textContent = "Email o contraseña incorrectos.";
      $("loginMsg").hidden = false;
      $("loginBtn").disabled = false;
    }
  };

  $("logoutBtn").onclick = () => supabase.auth.signOut();
}
