/**
 * Clase Turno.
 *
 * Datos: fecha, horario, nombre, apellido, dni, telefono, tipoObraSocial (puede ser null).
 * Funciones: crear(...) y eliminar() con confirmación previa.
 * Los turnos no se modifican: para cambiar uno se elimina y se crea otro.
 *
 * El turno guarda una copia de los datos del paciente en el momento de asignarlo.
 *
 * Las reglas del consultorio se controlan en dos lugares:
 *   - acá, para mostrar mensajes claros a la secretaria;
 *   - en la base (supabase/02_turnos.sql), para que no se puedan saltear:
 *     `unique (fecha, horario)` impide sobreturnos, un `check` limita la grilla
 *     y un trigger bloquea cualquier modificación.
 */

import { Paciente } from "./Paciente.js";
import { DURACION, esHorarioValido, esPasado, horaAMinutos, minutosAHora } from "../agenda.js";

export class Turno {
  constructor({ id, fecha, horario, nombre, apellido, dni, telefono, tipoObraSocial }) {
    this.id = id ?? null; // id que asigna la base al guardar (null antes de guardarlo)
    this.fecha = fecha; // "AAAA-MM-DD"
    this.horario = horario; // "HH:MM" (inicio del turno)
    this.nombre = nombre;
    this.apellido = apellido;
    this.dni = dni; // int
    this.telefono = telefono; // int
    this.tipoObraSocial = tipoObraSocial ?? null; // string o null
    Object.freeze(this); // un turno creado no se puede modificar
  }

  /** Horario de inicio en minutos desde la medianoche. Ejemplo: "08:40" → 520. */
  get minutos() {
    return horaAMinutos(this.horario);
  }

  /** Hora de fin del turno ("HH:MM"): inicio + 40 minutos. */
  get fin() {
    return minutosAHora(this.minutos + DURACION);
  }

  /**
   * Convierte una fila de la tabla `turnos` en un Turno.
   * PostgreSQL devuelve el horario como "08:40:00"; slice(0, 5) lo deja en "08:40".
   */
  static desdeFila(f) {
    return new Turno({
      id: f.id,
      fecha: f.fecha,
      horario: String(f.horario).slice(0, 5),
      nombre: f.nombre,
      apellido: f.apellido,
      dni: Number(f.dni),
      telefono: Number(f.telefono),
      tipoObraSocial: f.tipo_obra_social,
    });
  }

  /** Convierte el Turno al formato de una fila de la tabla (sin el id, que lo genera la base). */
  aFila() {
    return {
      fecha: this.fecha,
      horario: this.horario,
      nombre: this.nombre,
      apellido: this.apellido,
      dni: this.dni,
      telefono: this.telefono,
      tipo_obra_social: this.tipoObraSocial,
    };
  }

  /**
   * Crea el turno y lo guarda en la base.
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase
   * @param {object} args fecha ("AAAA-MM-DD"), hora ("HH:MM"), nombre, apellido,
   *                      dni (int), telefono (int), tipoObraSocial (string o null).
   * @returns {Promise<Turno>} El turno guardado, con su id.
   * @throws {Error} Si el horario está fuera de la grilla, ya pasó o está ocupado.
   */
  static async crear(supabase, { fecha, hora, nombre, apellido, dni, telefono, tipoObraSocial }) {
    const error = Paciente.validar({ nombre, apellido, dni, telefono });
    if (error) throw new Error(error);
    const minutos = horaAMinutos(hora);
    if (!esHorarioValido(minutos)) throw new Error("El horario está fuera de la grilla de 8:00 a 20:00.");
    if (esPasado(fecha, minutos)) throw new Error("No se pueden crear turnos en horarios que ya pasaron.");

    const turno = new Turno({ fecha, horario: hora, nombre, apellido, dni, telefono, tipoObraSocial });
    // .select().single() hace que la base devuelva la fila insertada, con el id generado.
    const { data, error: e } = await supabase.from("turnos").insert(turno.aFila()).select().single();
    if (e) {
      // 23505 = valor duplicado. Lo dispara `unique (fecha, horario)` si el horario ya
      // tiene turno, aunque lo haya ocupado otra persona hace un instante (sin sobreturnos).
      if (e.code === "23505") throw new Error("Este horario ya tiene un turno. No se admiten sobreturnos.");
      throw e;
    }
    return Turno.desdeFila(data);
  }

  /**
   * Asigna un paciente ya cargado a un horario libre.
   * Copia los datos del paciente al turno y llama a crear().
   * @param {Paciente} paciente
   * @param {string} fecha "AAAA-MM-DD"
   * @param {string} hora "HH:MM"
   */
  static asignar(supabase, paciente, fecha, hora) {
    return Turno.crear(supabase, {
      fecha,
      hora,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      dni: paciente.dni,
      telefono: paciente.telefono,
      tipoObraSocial: paciente.tipoObraSocial,
    });
  }

  /**
   * Turnos asignados en un día, ordenados por horario.
   * @param {string} fecha "AAAA-MM-DD"
   * @returns {Promise<Turno[]>}
   */
  static async delDia(supabase, fecha) {
    const { data, error } = await supabase.from("turnos").select("*").eq("fecha", fecha).order("horario");
    if (error) throw error;
    return data.map(Turno.desdeFila);
  }

  /**
   * Turnos de un paciente, del más viejo al más nuevo.
   * @param {number} dni
   * @returns {Promise<Turno[]>}
   */
  static async dePaciente(supabase, dni) {
    const { data, error } = await supabase
      .from("turnos")
      .select("*")
      .eq("dni", dni)
      .order("fecha")
      .order("horario");
    if (error) throw error;
    return data.map(Turno.desdeFila);
  }

  /**
   * Elimina el turno por completo; el horario queda libre para asignarlo de nuevo.
   * La interfaz pide la confirmación antes de llamar a este método.
   * @throws {Error} Si el turno ya no existe (por ejemplo, lo eliminó otro puesto).
   */
  async eliminar(supabase) {
    // .select("id") devuelve las filas borradas: si viene vacío, no había nada que borrar.
    const { data, error } = await supabase.from("turnos").delete().eq("id", this.id).select("id");
    if (error) throw error;
    if (!data.length) throw new Error("El turno ya no existe. Puede que lo haya eliminado otra persona.");
  }
}
