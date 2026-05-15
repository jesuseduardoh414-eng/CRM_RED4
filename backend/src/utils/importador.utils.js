const XLSX = require('xlsx');
const prisma = require('../lib/prisma');

const ESTADOS_VALIDOS = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
const PRIORIDADES_VALIDAS = ['BAJA', 'MEDIA', 'ALTA'];
const COLUMNAS_EXCEL = ['titulo', 'descripcion', 'estado', 'prioridad', 'fechaInicio', 'venceEn', 'asignadoEmail'];

const validarFila = (raw) => {
  const errores = [];

  if (!raw.titulo || String(raw.titulo).trim() === '') {
    errores.push('falta el campo obligatorio "titulo"');
  }

  if (raw.estado) {
    const estado = String(raw.estado).trim().toUpperCase();
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push(`estado "${raw.estado}" no valido (usa: ${ESTADOS_VALIDOS.join(' | ')})`);
    } else {
      raw.estado = estado;
    }
  }

  if (raw.prioridad) {
    const prioridad = String(raw.prioridad).trim().toUpperCase();
    if (!PRIORIDADES_VALIDAS.includes(prioridad)) {
      errores.push(`prioridad "${raw.prioridad}" no valida (usa: ${PRIORIDADES_VALIDAS.join(' | ')})`);
    } else {
      raw.prioridad = prioridad;
    }
  }

  if (raw.fechaInicio) {
    const fecha = new Date(raw.fechaInicio);
    if (Number.isNaN(fecha.getTime())) {
      errores.push(`fechaInicio "${raw.fechaInicio}" no es una fecha valida (usa formato YYYY-MM-DD)`);
    }
  }

  if (raw.venceEn) {
    const fecha = new Date(raw.venceEn);
    if (Number.isNaN(fecha.getTime())) {
      errores.push(`venceEn "${raw.venceEn}" no es una fecha valida (usa formato YYYY-MM-DD)`);
    }
  }

  if (errores.length > 0) {
    return { valida: false, tarea: null, razon: errores.join('; ') };
  }

  return {
    valida: true,
    tarea: {
      titulo: String(raw.titulo).trim(),
      descripcion: raw.descripcion ? String(raw.descripcion).trim() : null,
      estado: raw.estado ? String(raw.estado).toUpperCase() : 'PENDIENTE',
      prioridad: raw.prioridad ? String(raw.prioridad).toUpperCase() : 'MEDIA',
      fechaInicio: raw.fechaInicio ? new Date(raw.fechaInicio) : new Date(),
      venceEn: raw.venceEn ? new Date(raw.venceEn) : null,
      asignadoEmail: raw.asignadoEmail ? String(raw.asignadoEmail).trim().toLowerCase() : null,
    },
    razon: null,
  };
};

const obtenerTextoDesdeFuente = (fileSource) => {
  if (Buffer.isBuffer(fileSource)) {
    return fileSource.toString('utf-8');
  }
  return String(fileSource || '');
};

const procesarJSON = async (fileSource, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto = null) => {
  let raw;
  try {
    const contenido = obtenerTextoDesdeFuente(fileSource).replace(/^\uFEFF/, '').trim();
    raw = JSON.parse(contenido);
  } catch (error) {
    throw new Error(`El archivo JSON no es valido o esta mal formateado${error?.message ? `: ${error.message}` : ''}`);
  }

  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object' && Array.isArray(raw.tareas)) {
      raw = raw.tareas;
    } else {
      throw new Error('El archivo JSON debe contener un array de tareas en la raiz o una propiedad "tareas" con ese array');
    }
  }

  return procesarFilas(raw, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto);
};

const procesarExcel = async (fileSource, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto = null) => {
  let workbook;
  try {
    workbook = Buffer.isBuffer(fileSource)
      ? XLSX.read(fileSource, { type: 'buffer' })
      : XLSX.readFile(fileSource);
  } catch {
    throw new Error('El archivo Excel no se pudo leer. Verifica que sea un .xlsx o .xls valido');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    throw new Error('El archivo Excel esta vacio o solo contiene el encabezado');
  }

  const primeraFila = rows[0];
  if (!('titulo' in primeraFila)) {
    throw new Error(`El archivo Excel no tiene la columna "titulo". Columnas esperadas: ${COLUMNAS_EXCEL.join(', ')}`);
  }

  const filasValidas = rows.filter((row) =>
    COLUMNAS_EXCEL.some((col) => row[col] && String(row[col]).trim() !== '')
  );

  return procesarFilas(filasValidas, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto);
};

const procesarFilas = async (filas, proyectoId, miembros, registrarActividad, usuarioId, asignadoPorDefecto = null) => {
  const errores = [];
  const tareasACrear = [];

  for (let i = 0; i < filas.length; i += 1) {
    const numeroFila = i + 1;
    const { valida, tarea, razon } = validarFila(filas[i]);

    if (!valida) {
      errores.push({ fila: numeroFila, razon });
      continue;
    }

    if (tarea.asignadoEmail) {
      const miembro = miembros.find((m) => m.email.toLowerCase() === tarea.asignadoEmail);
      tarea.asignadoId = miembro ? miembro.id : asignadoPorDefecto;
    } else {
      tarea.asignadoId = asignadoPorDefecto;
    }

    delete tarea.asignadoEmail;
    tarea.proyectoId = proyectoId;
    tarea.creadorId = usuarioId;
    tareasACrear.push(tarea);
  }

  let creadas = 0;
  if (tareasACrear.length > 0) {
    await prisma.$transaction(
      tareasACrear.map((tarea) => prisma.tarea.create({ data: tarea }))
    );
    creadas = tareasACrear.length;

    await registrarActividad(
      usuarioId,
      proyectoId,
      'IMPORTAR_TAREAS',
      `Se importaron ${creadas} tarea(s) masivamente al proyecto`
    );
  }

  return { creadas, errores };
};

const generarPlantillaJSON = () => ([
  {
    titulo: 'Diseno de interfaz de usuario',
    descripcion: 'Crear wireframes y mockups para la nueva pantalla de reportes',
    estado: 'PENDIENTE',
    prioridad: 'ALTA',
    fechaInicio: '2025-06-01',
    venceEn: '2025-06-15',
    asignadoEmail: 'miembro@empresa.com',
  },
  {
    titulo: 'Integracion con API de pagos',
    descripcion: 'Conectar el modulo de facturacion con el gateway de pago seleccionado',
    estado: 'EN_PROGRESO',
    prioridad: 'ALTA',
    venceEn: '2025-06-30',
    asignadoEmail: '',
  },
  {
    titulo: 'Documentacion tecnica',
    descripcion: 'Escribir la documentacion del modulo de autenticacion',
    estado: 'PENDIENTE',
    prioridad: 'BAJA',
    venceEn: '',
    asignadoEmail: '',
  },
]);

const generarPlantillaExcel = () => {
  const datos = generarPlantillaJSON();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos, { header: COLUMNAS_EXCEL });

  ws['!cols'] = [
    { wch: 35 },
    { wch: 55 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
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
