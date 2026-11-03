/**
 * Reglas de la grilla de turnos y utilidades de fecha y hora.
 *
 * Los horarios se manejan como "minutos desde la medianoche" (por ejemplo,
 * 08:40 = 520). Así sumar 40 minutos o comparar horarios es una cuenta simple.
 * Las fechas se manejan como texto "AAAA-MM-DD", el mismo formato que usa
 * la columna `date` de PostgreSQL y el <input type="date">.
 */

/** Primer turno del día: 08:00, en minutos. */
export const INICIO = 8 * 60;
/** Duración de cada turno, en minutos. */
export const DURACION = 40;
/** Turnos por día: de 08:00 a 19:20; el último termina justo a las 20:00 (18 × 40 = 720 min = 12 h). */
export const CANTIDAD = 18;

/** Completa con un cero a la izquierda: 5 → "05". */
export const pad = (n) => String(n).padStart(2, "0");

/** Pasa minutos a texto de hora. Ejemplo: 500 → "08:20". */
export const minutosAHora = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);

/**
 * Pasa un texto de hora a minutos. Ejemplo: "08:20" → 500.
 * También acepta "08:20:00", que es como PostgreSQL devuelve las columnas `time`.
 */
export const horaAMinutos = (h) => {
  const [hh, mm] = String(h).split(":").map(Number);
  return hh * 60 + mm;
};

/** Devuelve los minutos de inicio de los 18 turnos del día: [480, 520, 560, ..., 1160]. */
export const horariosDelDia = () =>
  Array.from({ length: CANTIDAD }, (_, i) => INICIO + i * DURACION);

/**
 * Indica si un horario es el inicio de un turno válido de la grilla:
 * entero, desde las 08:00, que termine a las 20:00 o antes,
 * y que caiga justo en un múltiplo de 40 minutos desde las 08:00
 * (08:40 sí; 08:30 no).
 */
export const esHorarioValido = (m) =>
  Number.isInteger(m) && m >= INICIO && m + DURACION <= INICIO + CANTIDAD * DURACION && (m - INICIO) % DURACION === 0;

/** Pasa un Date a texto "AAAA-MM-DD" usando la hora local (no UTC). */
export const fechaISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

/**
 * Pasa "AAAA-MM-DD" a Date en hora local.
 * No se usa new Date("2026-10-30") porque lo interpreta en UTC, y en Argentina
 * (UTC-3) daría el día anterior a las 21:00.
 */
export const parseFecha = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d); // los meses en Date van de 0 a 11
};

/** Indica si el turno de esa fecha y horario ya empezó (está en el pasado). */
export const esPasado = (fecha, minutos) => {
  const d = parseFecha(fecha);
  d.setMinutes(minutos);
  return d.getTime() < Date.now();
};

/** Fecha en texto largo en español. Ejemplo: "viernes, 30 de octubre de 2026". */
export const fechaLarga = (s) =>
  parseFecha(s).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Fecha en formato argentino. Ejemplo: "2026-10-30" → "30/10/2026". */
export const fechaCorta = (s) => s.split("-").reverse().join("/");
