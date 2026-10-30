// Inicio de sesión de la secretaría con Supabase Auth (email y contraseña).
// El usuario se crea desde el panel de Supabase: Authentication → Users → Add user.

import { supabase } from "../supabase.js";
import { $ } from "../ui.js";

/** Muestra el login si no hay sesión; cuando la hay, llama a onIngreso(usuario) una sola vez. */
export async function requerirSesion(onIngreso) {
  let iniciado = false;
  const entrar = (usuario) => {
    $("viewLogin").hidden = true;
    $("viewApp").hidden = false;
    $("userEmail").textContent = usuario.email;
    if (!iniciado) {
      iniciado = true;
      onIngreso(usuario);
    }
  };

  const { data } = await supabase.auth.getSession();
  if (data.session) entrar(data.session.user);
  else $("viewLogin").hidden = false;

  supabase.auth.onAuthStateChange((evento, sesion) => {
    if (evento === "SIGNED_OUT") location.reload();
    else if (sesion && !iniciado) entrar(sesion.user);
  });

  $("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    $("loginBtn").disabled = true;
    $("loginMsg").hidden = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: $("loginEmail").value.trim(),
      password: $("loginPass").value,
    });
    if (error) {
      $("loginMsg").textContent = "Email o contraseña incorrectos.";
      $("loginMsg").hidden = false;
      $("loginBtn").disabled = false;
    }
  };

  $("logoutBtn").onclick = () => supabase.auth.signOut();
}
