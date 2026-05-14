// Controlador de Tareas
// GET    /api/proyectos/:id/tareas  †’ listar tareas de un proyecto
// POST   /api/proyectos/:id/tareas  †’ crear tarea
// PUT    /api/tareas/:id            †’ editar tarea
// DELETE /api/tareas/:id            †’ eliminar tarea
// PATCH  /api/tareas/:id/estado     †’ actualizar solo el estado

const prisma = require('../lib/prisma');
const { registrarActividad } = require('../utils/logger');

// Selector comÃºn para incluir datos del asignado sin exponer password
const INCLUDE_ASIGNADO = {
  asignado: {
    select: { id: true, nombre: true, area: true },
  },
};

// Helper para crear notificaciones
const crearNotificacion = async (usuarioId, mensaje, tipo, tareaId = null) => {
  if (!usuarioId) return;
  try {
    await prisma.notificacion.create({
      data: {
        usuarioId,
        mensaje,
        tipo,
        tareaId
      }
    });
  } catch (error) {
    console.error('[crearNotificacion]', error);
  }
};

// €€ GET /api/proyectos/:id/tareas €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
// ADMIN †’ ve todas las tareas del proyecto
// MIEMBRO †’ ve todas las tareas de los proyectos donde es miembro
const listar = async (req, res) => {
  const proyectoId = parseInt(req.params.id);
  if (isNaN(proyectoId)) return res.status(400).json({ error: 'ID de proyecto invÃ¡lido' });

  try {
    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { 
        creador: { select: { id: true, nombre: true, area: true } },
        miembros: { select: { id: true } }
      },
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Verificar permisos: ADMIN puede todo, MIEMBRO debe ser parte del equipo
    const esAdmin = req.usuario.rol === 'ADMIN';
    if (!esAdmin) {
      const esMiembro = proyecto.miembros.some(m => m.id === req.usuario.id);
      if (!esMiembro) {
        return res.status(403).json({ error: 'No tienes permiso para ver las tareas de este proyecto' });
      }
    }

    const tareas = await prisma.tarea.findMany({
      where: { proyectoId },
      orderBy: { creadoEn: 'asc' },
      include: INCLUDE_ASIGNADO,
    });

    // Ajustar fechas para evitar desfases de zona horaria (poner a mediodía)
    const tareasAjustadas = tareas.map(t => {
      if (t.venceEn) {
        const d = new Date(t.venceEn);
        if (d.getUTCHours() === 0) d.setUTCHours(12);
        t.venceEn = d;
      }
      if (t.fechaInicio) {
        const d = new Date(t.fechaInicio);
        if (d.getUTCHours() === 0) d.setUTCHours(12);
        t.fechaInicio = d;
      }
      return t;
    });

    return res.json({
      proyecto,
      tareas: tareasAjustadas,
      filtradoPorUsuario: false, 
    });
  } catch (error) {
    console.error('[tareas.listar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ POST /api/proyectos/:id/tareas €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const crear = async (req, res) => {
  const proyectoId = parseInt(req.params.id);
  if (isNaN(proyectoId)) return res.status(400).json({ error: 'ID de proyecto invÃ¡lido' });

  const { titulo, descripcion, asignadoId, prioridad, estado, fechaInicio, venceEn, dependeDeId, primerComentario } = req.body;
  const archivos = req.files;

  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ error: 'El tÃ­tulo de la tarea es requerido' });
  }

  try {
    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Si es MIEMBRO, verificar que pertenece a la lista de miembros del proyecto
    if (req.usuario.rol !== 'ADMIN') {
      const miembro = await prisma.proyecto.findFirst({
        where: {
          id: proyectoId,
          miembros: { some: { id: req.usuario.id } }
        }
      });
      if (!miembro) {
        return res.status(403).json({ error: 'No tienes permiso para crear tareas en este proyecto' });
      }
    }

    // Crear la tarea
    let dInicio = fechaInicio ? new Date(fechaInicio) : new Date();
    if (dInicio.getUTCHours() === 0) dInicio.setUTCHours(12);

    let dVence = venceEn ? new Date(venceEn) : null;
    if (dVence && dVence.getUTCHours() === 0) dVence.setUTCHours(12);

    const tarea = await prisma.tarea.create({
      data: {
        titulo:      titulo.trim(),
        descripcion: descripcion?.trim() || null,
        prioridad:   prioridad  || 'MEDIA',
        estado:      estado     || 'PENDIENTE',
        fechaInicio: dInicio,
        venceEn:     dVence,
        proyectoId,
        asignadoId:  asignadoId ? parseInt(asignadoId) : null,
        dependeDeId: dependeDeId ? parseInt(dependeDeId) : null,
      },
      include: INCLUDE_ASIGNADO,
    });

    // 1. Crear comentario inicial si existe
    if (primerComentario && primerComentario.trim() !== '') {
      await prisma.comentario.create({
        data: {
          contenido: primerComentario.trim(),
          tareaId: tarea.id,
          autorId: req.usuario.id
        }
      });
    }

    // 2. Guardar archivos si existen
    if (archivos && archivos.length > 0) {
      const adjuntosData = archivos.map(file => ({
        nombre: file.originalname,
        url: file.filename,
        tipo: file.mimetype,
        tamano: file.size,
        tareaId: tarea.id,
        usuarioId: req.usuario.id
      }));

      await prisma.adjunto.createMany({
        data: adjuntosData
      });
    }

    // Notificar al asignado si no es quien la crea
    if (tarea.asignadoId && tarea.asignadoId !== req.usuario.id) {
      await crearNotificacion(
        tarea.asignadoId,
        `Te han asignado una nueva tarea: "${tarea.titulo}"`,
        'ASIGNACION',
        tarea.id
      );
    }

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      proyectoId,
      'CREAR_TAREA',
      `${req.usuario.nombre} creó la tarea "${tarea.titulo}"${archivos?.length ? ` con ${archivos.length} archivos` : ''}`
    );

    return res.status(201).json({ mensaje: 'Tarea creada exitosamente', tarea });
  } catch (error) {
    console.error('[tareas.crear]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ PUT /api/tareas/:id €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const editar = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });

  const { titulo, descripcion, asignadoId, prioridad, estado, fechaInicio, venceEn, dependeDeId } = req.body;

  try {
    const existente = await prisma.tarea.findUnique({ 
      where: { id },
      include: { proyecto: { include: { miembros: { select: { id: true } } } } }
    });
    if (!existente) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Verificar permisos: ADMIN o Miembro del proyecto
    if (req.usuario.rol !== 'ADMIN') {
      const esMiembro = existente.proyecto.miembros.some(m => m.id === req.usuario.id);
      if (!esMiembro) {
        return res.status(403).json({ error: 'No tienes permiso para editar esta tarea' });
      }
    }

    let dInicio = fechaInicio !== undefined ? (fechaInicio ? new Date(fechaInicio) : new Date()) : undefined;
    if (dInicio && dInicio.getUTCHours() === 0) dInicio.setUTCHours(12);

    let dVence = venceEn !== undefined ? (venceEn ? new Date(venceEn) : null) : undefined;
    if (dVence && dVence.getUTCHours() === 0) dVence.setUTCHours(12);

    const tarea = await prisma.tarea.update({
      where: { id },
      data: {
        ...(titulo       !== undefined && { titulo: titulo.trim() }),
        ...(descripcion  !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(prioridad    !== undefined && { prioridad }),
        ...(estado       !== undefined && { estado }),
        ...(asignadoId   !== undefined && { asignadoId: asignadoId ? parseInt(asignadoId) : null }),
        ...(dInicio      !== undefined && { fechaInicio: dInicio }),
        ...(dVence       !== undefined && { venceEn: dVence }),
        ...(dependeDeId  !== undefined && { dependeDeId: dependeDeId ? parseInt(dependeDeId) : null }),
      },
      include: INCLUDE_ASIGNADO,
    });

    // Notificar cambios al asignado si no es quien edita
    if (tarea.asignadoId && tarea.asignadoId !== req.usuario.id) {
      let msg = '';
      if (existente.asignadoId !== tarea.asignadoId) {
        msg = `Te han asignado la tarea: "${tarea.titulo}"`;
      } else if (existente.estado !== tarea.estado) {
        msg = `El estado de tu tarea "${tarea.titulo}" cambió a ${tarea.estado}`;
      } else {
        msg = `Se actualizó la información de tu tarea: "${tarea.titulo}"`;
      }
      
      await crearNotificacion(tarea.asignadoId, msg, 'URGENTE', tarea.id);
    }

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      tarea.proyectoId,
      'EDITAR_TAREA',
      `${req.usuario.nombre} editó la tarea "${tarea.titulo}"`
    );

    return res.json({ mensaje: 'Tarea actualizada', tarea });
  } catch (error) {
    console.error('[tareas.editar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ DELETE /api/tareas/:id €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const eliminar = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalido' });

  try {
    const existente = await prisma.tarea.findUnique({ 
      where: { id },
      include: { proyecto: { include: { miembros: { select: { id: true } } } } }
    });
    if (!existente) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Verificar permisos: ADMIN o Miembro del proyecto
    if (req.usuario.rol !== 'ADMIN') {
      const esMiembro = existente.proyecto.miembros.some(m => m.id === req.usuario.id);
      if (!esMiembro) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta tarea' });
      }
    }

    await prisma.tarea.delete({ where: { id } });

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      existente.proyectoId,
      'ELIMINAR_TAREA',
      `${req.usuario.nombre} eliminó la tarea "${existente.titulo}"`
    );
    return res.json({ mensaje: 'Tarea eliminada' });
  } catch (error) {
    console.error('[tareas.eliminar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ PATCH /api/tareas/:id/estado €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const actualizarEstado = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalido' });

  const { estado } = req.body;
  const estadosValidos = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Debe ser: ${estadosValidos.join(', ')}` });
  }

  try {
    const existente = await prisma.tarea.findUnique({ 
      where: { id },
      include: { proyecto: { include: { miembros: { select: { id: true } } } } }
    });
    if (!existente) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Verificar permisos: ADMIN o Miembro del proyecto
    if (req.usuario.rol !== 'ADMIN') {
      const esMiembro = existente.proyecto.miembros.some(m => m.id === req.usuario.id);
      if (!esMiembro) {
        return res.status(403).json({ error: 'No tienes permiso para actualizar esta tarea' });
      }
    }

    const tarea = await prisma.tarea.update({
      where: { id },
      data:  { estado },
      include: INCLUDE_ASIGNADO,
    });
    // Notificar cambio de estado al asignado
    if (tarea.asignadoId && tarea.asignadoId !== req.usuario.id) {
      await crearNotificacion(
        tarea.asignadoId,
        `El estado de tu tarea "${tarea.titulo}" cambió a ${tarea.estado}`,
        'ESTADO',
        tarea.id
      );
    }

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      tarea.proyectoId,
      'CAMBIO_ESTADO',
      `${req.usuario.nombre} cambió el estado de "${tarea.titulo}" a ${tarea.estado}`
    );

    return res.json({ mensaje: 'Estado actualizado', tarea });
  } catch (error) {
    console.error('[tareas.actualizarEstado]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listar, crear, editar, eliminar, actualizarEstado };
