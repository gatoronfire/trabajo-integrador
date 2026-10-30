// Clase Paciente
// Datos: nombre, apellido, dni (int, identifica al paciente), telefono (int),
//        tipoObraSocial (string o null si no tiene obra social).

export class Paciente {
  constructor({ nombre, apellido, dni, telefono, tipoObraSocial }) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.dni = dni;
    this.telefono = telefono;
    this.tipoObraSocial = tipoObraSocial ?? null;
    Object.freeze(this);
  }

  get nombreCompleto() {
    return this.apellido + ", " + this.nombre;
  }

  /** Convierte una fila de la tabla `pacientes` en un Paciente. */
  static desdeFila(f) {
    return new Paciente({
      nombre: f.nombre,
      apellido: f.apellido,
      dni: Number(f.dni),
      telefono: Number(f.telefono),
      tipoObraSocial: f.tipo_obra_social,
    });
  }

  aFila() {
    return {
      nombre: this.nombre,
      apellido: this.apellido,
      dni: this.dni,
      telefono: this.telefono,
      tipo_obra_social: this.tipoObraSocial,
    };
  }

  /** Devuelve un mensaje de error, o null si los datos son válidos. */
  static validar({ nombre, apellido, dni, telefono }) {
    if (!nombre || !apellido) return "Completá nombre y apellido.";
    if (!Number.isInteger(dni) || dni < 1000000 || dni > 999999999)
      return "El DNI debe ser un número de 7 a 9 dígitos.";
    if (!Number.isInteger(telefono) || telefono < 1000000 || telefono > 999999999999999)
      return "El teléfono debe ser un número de 7 a 15 dígitos, sin espacios ni guiones.";
    return null;
  }

  /** Da de alta un paciente. El DNI no se puede repetir. */
  static async crear(supabase, datos) {
    const error = Paciente.validar(datos);
    if (error) throw new Error(error);
    const paciente = new Paciente(datos);
    const { error: e } = await supabase.from("pacientes").insert(paciente.aFila());
    if (e) {
      if (e.code === "23505") throw new Error("Ya existe un paciente con ese DNI.");
      throw e;
    }
    return paciente;
  }

  /** Lista todos los pacientes ordenados por apellido y nombre. */
  static async listar(supabase) {
    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .order("apellido")
      .order("nombre");
    if (error) throw error;
    return data.map(Paciente.desdeFila);
  }
}
