// Reglas de la grilla de turnos y utilidades de fecha/hora.

export const INICIO = 8 * 60; // 08:00 en minutos
export const DURACION = 40; // minutos por turno
export const CANTIDAD = 18; // 08:00 → 19:20; el último termina a las 20:00

export const pad = (n) => String(n).padStart(2, "0");

/** 500 → "08:20" */
export const minutosAHora = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);

/** "08:20" o "08:20:00" → 500 */
export const horaAMinutos = (h) => {
  const [hh, mm] = String(h).split(":").map(Number);
  return hh * 60 + mm;
};

/** Minutos de inicio de los 18 turnos del día. */
export const horariosDelDia = () =>
  Array.from({ length: CANTIDAD }, (_, i) => INICIO + i * DURACION);

export const esHorarioValido = (m) =>
  Number.isInteger(m) && m >= INICIO && m + DURACION <= INICIO + CANTIDAD * DURACION && (m - INICIO) % DURACION === 0;

export const fechaISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export const parseFecha = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const esPasado = (fecha, minutos) => {
  const d = parseFecha(fecha);
  d.setMinutes(minutos);
  return d.getTime() < Date.now();
};

export const fechaLarga = (s) =>
  parseFecha(s).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const fechaCorta = (s) => s.split("-").reverse().join("/");
