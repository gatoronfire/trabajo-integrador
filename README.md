# Agenda del Consultorio

Sistema de turnos para la secretaría de un consultorio con un solo médico.
Trabajo integrador de Ingeniería de Software II.

- Turnos de 40 minutos, de 8:00 a 20:00 (18 turnos por día).
- No se admiten sobreturnos.
- Los turnos no se modifican: se crean o se eliminan (con confirmación).
- Pacientes con nombre, apellido, DNI, teléfono y tipo de obra social (opcional).

## Tecnologías

- [Vite](https://vitejs.dev/) con JavaScript (sin framework)
- [Supabase](https://supabase.com/) como base de datos (PostgreSQL)

## Cómo correrlo

```bash
npm install
cp .env.example .env   # y completar con los datos de Supabase
npm run dev
```

## Base de datos

En Supabase, abrir **SQL Editor** y ejecutar en orden los archivos de `supabase/`:

| Archivo | Qué hace |
|---|---|
| `01_pacientes.sql` | Tabla de pacientes |
| `02_turnos.sql` | Tabla de turnos, sin sobreturnos y sin modificaciones |

## Estructura

```
src/
  main.js              arranque y pestañas
  agenda.js            reglas de la grilla (horarios, 40 min, 8 a 20)
  supabase.js          cliente de Supabase (lee el .env)
  store.js             lista de pacientes compartida entre vistas
  ui.js                utilidades de interfaz y formulario de paciente
  models/
    Paciente.js        clase Paciente
    Turno.js           clase Turno: crear, asignar, eliminar
  views/
    pacientesView.js   pestaña Pacientes
    agendaView.js      pestaña Turnos
supabase/              scripts SQL de la base de datos
```
