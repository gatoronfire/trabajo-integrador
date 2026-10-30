// Clase Turno (según la especificación del trabajo integrador)
// Datos: horario, fecha, nombre, apellido, dni, telefono, tipoObraSocial (puede ser null)
// Funciones: crear(...) y eliminar() con confirmación previa. Los turnos no se modifican.

import { Paciente } from "./Paciente.js";
import { DURACION, esHorarioValido, esPasado, horaAMinutos, minutosAHora } from "../agenda.js";

export class Turno {
  constructor({ id, fecha, horario, nombre, apellido, dni, telefono, tipoObraSocial }) {
    this.id = id ?? null; // id de la base de datos
    this.fecha = fecha; // "AAAA-MM-DD"
    this.horario = horario; // "HH:MM" (inicio del turno)
    this.nombre = nombre;
    this.apellido = apellido;
    this.dni = dni; // int
    this.telefono = telefono; // int
    this.tipoObraSocial = tipoObraSocial ?? null; // string o null
    Object.freeze(this); // un turno creado no se puede modificar
  }

  get minutos() {
    return horaAMinutos(this.horario);
  }

  get fin() {
    return minutosAHora(this.minutos + DURACION);
  }

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
   * Crea el turno y lo guarda.
   * Args: fecha, hora ("HH:MM"), nombre, apellido, dni (int), telefono (int), tipoObraSocial.
   * Rechaza horarios fuera de la grilla, pasados u ocupados (no hay sobreturnos).
   */
  static async crear(supabase, { fecha, hora, nombre, apellido, dni, telefono, tipoObraSocial }) {
    const error = Paciente.validar({ nombre, apellido, dni, telefono });
    if (error) throw new Error(error);
    const minutos = horaAMinutos(hora);
    if (!esHorarioValido(minutos)) throw new Error("El horario está fuera de la grilla de 8:00 a 20:00.");
    if (esPasado(fecha, minutos)) throw new Error("No se pueden crear turnos en horarios que ya pasaron.");

    const turno = new Turno({ fecha, horario: hora, nombre, apellido, dni, telefono, tipoObraSocial });
    const { data, error: e } = await supabase.from("turnos").insert(turno.aFila()).select().single();
    if (e) {
      if (e.code === "23505") throw new Error("Este horario ya tiene un turno. No se admiten sobreturnos.");
      throw e;
    }
    return Turno.desdeFila(data);
  }

  /** Asigna un paciente ya cargado a un horario libre. */
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

  /** Turnos de un día, ordenados por horario. */
  static async delDia(supabase, fecha) {
    const { data, error } = await supabase.from("turnos").select("*").eq("fecha", fecha).order("horario");
    if (error) throw error;
    return data.map(Turno.desdeFila);
  }

  /** Turnos de un paciente, del más viejo al más nuevo. */
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
   */
  async eliminar(supabase) {
    const { data, error } = await supabase.from("turnos").delete().eq("id", this.id).select("id");
    if (error) throw error;
    if (!data.length) throw new Error("El turno ya no existe. Puede que lo haya eliminado otra persona.");
  }
}
