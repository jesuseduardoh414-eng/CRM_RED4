/**
 * PROCESADOR DE IMPORTACIÓN MASIVA DE TAREAS
 * ===========================================
 * 
 * ESTRUCTURA DE LA BASE DE DATOS (tabla "tareas"):
 * ─────────────────────────────────────────────────
 *   id          Int       Auto-generado (no incluir en importación)
 *   titulo      String    OBLIGATORIO - Título descriptivo de la tarea
 *   descripcion String?   Opcional - Descripción detallada
 *   estado      String    Valores válidos: PENDIENTE | EN_PROGRESO | HECHO
 *                         Default si se omite: PENDIENTE
 *   prioridad   String    Valores válidos: BAJA | MEDIA | ALTA
 *                         Default si se omite: MEDIA
 *   venceEn     DateTime? Opcional - Formato: YYYY-MM-DD (ej: 2025-12-31)
 *   asignadoEmail String? Opcional - Email del miembro del proyecto a asignar
 *   proyectoId  Int       Provisto por la URL, no incluir en el archivo
 * 
 * FORMATO EXCEL (primera fila = encabezados exactos):
 * ────────────────────────────────────────────────────
 *   titulo | descripcion | estado | prioridad | venceEn | asignadoEmail
 * 
 * FORMATO JSON (array de objetos):
 * ─────────────────────────────────
 *   [
 *     { "titulo": "...", "descripcion": "...", "estado": "...",
 *       "prioridad": "...", "venceEn": "YYYY-MM-DD", "asignadoEmail": "..." },
 *     ...
 *   ]
 * 
 * CAMPOS OBLIGATORIOS: titulo
 * CAMPOS OPCIONALES:   descripcion, estado, prioridad, venceEn, asignadoEmail
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const prisma = require('../lib/prisma');

// ── Constantes de validación ────────────────────────────────────────────────
const ESTADOS_VALIDOS   = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
const PRIORIDADES_VALID = ['BAJA', 'MEDIA', 'ALTA'];
const COLUMNS_EXCEL     = ['titulo', 'descripcion', 'estado', 'prioridad', 'fechaInicio', 'venceEn', 'asignadoEmail'];

/**
 * Valida y normaliza un objeto de tarea raw.
 * @returns { valida: bool, tarea: object|null, razon: string|null }
 */
const validarFila = (raw, indice) => {
  const errores = [];

  // Campo obligatorio
  if (!raw.titulo || String(raw.titulo).trim() === '') {
    errores.push(`falta el campo obligatorio "titulo"`);
  }

  // Estado
  if (raw.estado) {
    const estado = String(raw.estado).trim().toUpperCase();
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push(`estado "${raw.estado}" no válido (usa: ${ESTADOS_VALIDOS.join(' | ')})`);
    } else {
      raw.estado = estado;
    }
  }

  // Prioridad
  if (raw.prioridad) {
    const prioridad = String(raw.prioridad).trim().toUpperCase();
    if (!PRIORIDADES_VALID.includes(prioridad)) {
      errores.push(`prioridad "${raw.prioridad}" no válida (usa: ${PRIORIDADES_VALID.join(' | ')})`);
    } else {
      raw.prioridad = prioridad;
    }
  }

  // Fecha fechaInicio
  if (raw.fechaInicio) {
    const fecha = new Date(raw.fechaInicio);
    if (isNaN(fecha.getTime())) {
      errores.push(`fechaInicio "${raw.fechaInicio}" no es una fecha válida (usa formato YYYY-MM-DD)`);
    }
  }

  // Fecha venceEn
  if (raw.venceEn) {
    const fecha = new Date(raw.venceEn);
    if (isNaN(fecha.getTime())) {
      errores.push(`venceEn "${raw.venceEn}" no es una fecha válida (usa formato YYYY-MM-DD)`);
    }
  }

  if (errores.length > 0) {
    return { valida: false, tarea: null, razon: errores.join('; ') };
  }

  return {
    valida: true,
    tarea: {
      titulo:      String(raw.titulo).trim(),
      descripcion: raw.descripcion ? String(raw.descripcion).trim() : null,
      estado:      raw.estado    ? String(raw.estado).toUpperCase()    : 'PENDIENTE',
      prioridad:   raw.prioridad ? String(raw.prioridad).toUpperCase() : 'MEDIA',
      fechaInicio: raw.fechaInicio ? new Date(raw.fechaInicio) : new Date(),
      venceEn:     raw.venceEn   ? new Date(raw.venceEn) : null,
      asignadoEmail: raw.asignadoEmail ? String(raw.asignadoEmail).trim().toLowerCase() : null,
    },
    razon: null,
  };
};


// ── Procesador JSON ─────────────────────────────────────────────────────────
const procesarJSON = async (filePath, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto = null) => {
  let raw;
  try {
    const contenido = fs.readFileSync(filePath, 'utf-8');
    raw = JSON.parse(contenido);
  } catch {
    throw new Error('El archivo JSON no es válido o está mal formateado');
  }

  if (!Array.isArray(raw)) {
    throw new Error('El archivo JSON debe contener un array de tareas en el nivel raíz');
  }

  return procesarFilas(raw, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto);
};

// ── Procesador Excel ────────────────────────────────────────────────────────
const procesarExcel = async (filePath, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto = null) => {
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch {
    throw new Error('El archivo Excel no se pudo leer. Verifica que sea un .xlsx o .xls válido');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet     = workbook.Sheets[sheetName];
  const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Validar que tenga al menos una fila de datos
  if (rows.length === 0) {
    throw new Error('El archivo Excel está vacío o solo contiene el encabezado');
  }

  // Verificar que la primera fila tenga la columna obligatoria
  const primeraFila = rows[0];
  if (!('titulo' in primeraFila)) {
    throw new Error(`El archivo Excel no tiene la columna "titulo". Columnas esperadas: ${COLUMNS_EXCEL.join(', ')}`);
  }

  // Filtrar filas completamente vacías
  const filasValidas = rows.filter(row =>
    COLUMNS_EXCEL.some(col => row[col] && String(row[col]).trim() !== '')
  );

  return procesarFilas(filasValidas, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto);
};

// ── Procesamiento común ─────────────────────────────────────────────────────
const procesarFilas = async (filas, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto = null) => {
  const errores = [];
  const tareasACrear = [];

  for (let i = 0; i < filas.length; i++) {
    const numeroFila = i + 1;
    const { valida, tarea, razon } = validarFila(filas[i], numeroFila);

    if (!valida) {
      errores.push({ fila: numeroFila, razon });
      continue;
    }

    // Resolver asignado:
    // 1. Si la fila tiene asignadoEmail, intentar resolverlo
    // 2. Si no hay email o no se encontró, usar asignadoPorDefecto
    // 3. Si nada, dejar sin asignar
    if (tarea.asignadoEmail) {
      const miembro = miembros.find(m => m.email.toLowerCase() === tarea.asignadoEmail);
      if (miembro) {
        tarea.asignadoId = miembro.id;
      } else {
        // Email no encontrado → usar el default o dejar sin asignar (sin avisos ruidosos)
        tarea.asignadoId = asignadoPorDefecto;
      }
    } else {
      // Sin email en el archivo → usar el default
      tarea.asignadoId = asignadoPorDefecto;
    }

    delete tarea.asignadoEmail;
    tarea.proyectoId = proyectoId;
    tareasACrear.push(tarea);
  }

  // Insertar tareas válidas en lote
  let creadas = 0;
  if (tareasACrear.length > 0) {
    await prisma.$transaction(
      tareasACrear.map(t => prisma.tarea.create({ data: t }))
    );
    creadas = tareasACrear.length;

    // Registrar actividad de importación
    await registrarActividad(
      usuarioId,
      proyectoId,
      'IMPORTAR_TAREAS',
      `Se importaron ${creadas} tarea(s) masivamente al proyecto`
    );
  }

  return { creadas, errores };
};

// ── Generador de plantilla JSON ─────────────────────────────────────────────
const generarPlantillaJSON = () => {
  return [
    {
      titulo: "Diseño de interfaz de usuario",
      descripcion: "Crear wireframes y mockups para la nueva pantalla de reportes",
      estado: "PENDIENTE",
      prioridad: "ALTA",
      fechaInicio: "2025-06-01",
      venceEn: "2025-06-15",
      asignadoEmail: "miembro@empresa.com"
    },
    {
      titulo: "Integración con API de pagos",
      descripcion: "Conectar el módulo de facturación con el gateway de pago seleccionado",
      estado: "EN_PROGRESO",
      prioridad: "ALTA",
      venceEn: "2025-06-30",
      asignadoEmail: ""
    },
    {
      titulo: "Documentación técnica",
      descripcion: "Escribir la documentación del módulo de autenticación",
      estado: "PENDIENTE",
      prioridad: "BAJA",
      venceEn: "",
      asignadoEmail: ""
    }
  ];
};

// ── Generador de plantilla Excel ────────────────────────────────────────────
const generarPlantillaExcel = () => {
  const datos = [
    {
      titulo: "Diseño de interfaz de usuario",
      descripcion: "Crear wireframes y mockups para la nueva pantalla de reportes",
      estado: "PENDIENTE",
      prioridad: "ALTA",
      fechaInicio: "2025-06-01",
      venceEn: "2025-06-15",
      asignadoEmail: "miembro@empresa.com"
    },
    {
      titulo: "Integración con API de pagos",
      descripcion: "Conectar el módulo de facturación con el gateway de pago seleccionado",
      estado: "EN_PROGRESO",
      prioridad: "ALTA",
      venceEn: "2025-06-30",
      asignadoEmail: ""
    },
    {
      titulo: "Documentación técnica",
      descripcion: "Escribir la documentación del módulo de autenticación",
      estado: "PENDIENTE",
      prioridad: "BAJA",
      venceEn: "",
      asignadoEmail: ""
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos, { header: COLUMNS_EXCEL });

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 35 }, // titulo
    { wch: 55 }, // descripcion
    { wch: 15 }, // estado
    { wch: 12 }, // prioridad
    { wch: 14 }, // venceEn
    { wch: 30 }, // asignadoEmail
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Tareas');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  procesarJSON,
  procesarExcel,
  generarPlantillaJSON,
  generarPlantillaExcel,
};
