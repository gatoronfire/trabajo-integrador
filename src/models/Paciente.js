/**
 * Clase Paciente.
 *
 * Datos:
 *   - nombre, apellido (string)
 *   - dni (int): identifica al paciente, no se puede repetir
 *   - telefono (int)
 *   - tipoObraSocial (string, o null si no tiene obra social)
 *
 * La clase también se encarga de guardar y leer pacientes de la tabla
 * `pacientes` de Supabase. En la base las columnas usan snake_case
 * (tipo_obra_social) y en JavaScript camelCase (tipoObraSocial):
 * desdeFila() y aFila() hacen esa conversión.
 */

export class Paciente {
  /**
   * @param {{nombre:string, apellido:string, dni:number, telefono:number, tipoObraSocial?:string|null}} datos
   */
  constructor({ nombre, apellido, dni, telefono, tipoObraSocial }) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.dni = dni;
    this.telefono = telefono;
    // ?? convierte undefined en null: "sin obra social" siempre se guarda como null.
    this.tipoObraSocial = tipoObraSocial ?? null;
    // Congela el objeto: sus datos no se pueden cambiar después de crearlo.
    Object.freeze(this);
  }

  /** Nombre para mostrar en listas: "Apellido, Nombre". */
  get nombreCompleto() {
    return this.apellido + ", " + this.nombre;
  }

  /**
   * Convierte una fila de la tabla `pacientes` en un Paciente.
   * Number() se usa porque las columnas bigint pueden llegar como texto.
   */
  static desdeFila(f) {
    return new Paciente({
      nombre: f.nombre,
      apellido: f.apellido,
      dni: Number(f.dni),
      telefono: Number(f.telefono),
      tipoObraSocial: f.tipo_obra_social,
    });
  }

  /** Convierte el Paciente al formato de una fila de la tabla `pacientes`. */
  aFila() {
    return {
      nombre: this.nombre,
      apellido: this.apellido,
      dni: this.dni,
      telefono: this.telefono,
      tipo_obra_social: this.tipoObraSocial,
    };
  }

  /**
   * Valida los datos de un paciente.
   * Los mismos límites están como `check` en la base (supabase/01_pacientes.sql);
   * se validan acá también para mostrar un mensaje claro sin ir a la base.
   * @returns {string|null} Mensaje de error, o null si los datos son válidos.
   */
  static validar({ nombre, apellido, dni, telefono }) {
    if (!nombre || !apellido) return "Completá nombre y apellido.";
    if (!Number.isInteger(dni) || dni < 1000000 || dni > 999999999)
      return "El DNI debe ser un número de 7 a 9 dígitos.";
    if (!Number.isInteger(telefono) || telefono < 1000000 || telefono > 999999999999999)
      return "El teléfono debe ser un número de 7 a 15 dígitos, sin espacios ni guiones.";
    return null;
  }

  /**
   * Da de alta un paciente en la base.
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase
   * @param {object} datos Mismos campos que el constructor.
   * @returns {Promise<Paciente>}
   * @throws {Error} Si los datos no son válidos o el DNI ya existe.
   */
  static async crear(supabase, datos) {
    const error = Paciente.validar(datos);
    if (error) throw new Error(error);
    const paciente = new Paciente(datos);
    const { error: e } = await supabase.from("pacientes").insert(paciente.aFila());
    if (e) {
      // 23505 es el código de PostgreSQL para "valor duplicado": el DNI es la clave primaria.
      if (e.code === "23505") throw new Error("Ya existe un paciente con ese DNI.");
      throw e;
    }
    return paciente;
  }

  /**
   * Trae todos los pacientes ordenados por apellido y nombre.
   * @returns {Promise<Paciente[]>}
   */
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
