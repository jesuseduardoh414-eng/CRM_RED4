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
// MIEMBRO †’ ve Ãºnicamente sus tareas asignadas
const listar = async (req, res) => {
  const proyectoId = parseInt(req.params.id);
  if (isNaN(proyectoId)) return res.status(400).json({ error: 'ID de proyecto invÃ¡lido' });

  try {
    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { creador: { select: { id: true, nombre: true, area: true } } },
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Construir el filtro segÃºn el rol del usuario autenticado
    const esAdmin = req.usuario.rol === 'ADMIN';
    const where = {
      proyectoId,
      // Miembro solo ve sus propias tareas asignadas
      ...(!esAdmin && { asignadoId: req.usuario.id }),
    };

    const tareas = await prisma.tarea.findMany({
      where,
      orderBy: { creadoEn: 'asc' },
      include: INCLUDE_ASIGNADO,
    });

    return res.json({
      proyecto,
      tareas,
      // Indicar al frontend si la vista estÃ¡ filtrada
      filtradoPorUsuario: !esAdmin,
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
    const tarea = await prisma.tarea.create({
      data: {
        titulo:      titulo.trim(),
        descripcion: descripcion?.trim() || null,
        prioridad:   prioridad  || 'MEDIA',
        estado:      estado     || 'PENDIENTE',
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        venceEn:     venceEn    ? new Date(venceEn) : null,
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
      `${req.usuario.nombre} creÃ³ la tarea "${tarea.titulo}"${archivos?.length ? ` con ${archivos.length} archivos` : ''}`
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
    const existente = await prisma.tarea.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Tarea no encontrada' });

    const tarea = await prisma.tarea.update({
      where: { id },
      data: {
        ...(titulo       !== undefined && { titulo: titulo.trim() }),
        ...(descripcion  !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(prioridad    !== undefined && { prioridad }),
        ...(estado       !== undefined && { estado }),
        ...(asignadoId   !== undefined && { asignadoId: asignadoId ? parseInt(asignadoId) : null }),
        ...(fechaInicio  !== undefined && { fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date() }),
        ...(venceEn      !== undefined && { venceEn: venceEn ? new Date(venceEn) : null }),
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
        msg = `El estado de tu tarea "${tarea.titulo}" cambiÃ³ a ${tarea.estado}`;
      } else {
        msg = `Se actualizÃ³ la informaciÃ³n de tu tarea: "${tarea.titulo}"`;
      }
      
      await crearNotificacion(tarea.asignadoId, msg, 'URGENTE', tarea.id);
    }

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      tarea.proyectoId,
      'EDITAR_TAREA',
      `${req.usuario.nombre} editÃ³ la tarea "${tarea.titulo}"`
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
    const existente = await prisma.tarea.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Permitir si es ADMIN o si es el ASIGNADO de la tarea
    const esAdmin = req.usuario.rol === 'ADMIN';
    const esAsignado = existente.asignadoId === req.usuario.id;

    if (!esAdmin && !esAsignado) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta tarea' });
    }

    await prisma.tarea.delete({ where: { id } });

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      existente.proyectoId,
      'ELIMINAR_TAREA',
      `${req.usuario.nombre} eliminÃ³ la tarea "${existente.titulo}"`
    );
    return res.json({ mensaje: 'Tarea eliminada' });
  } catch (error) {
    console.error('[tareas.eliminar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ PATCH /api/tareas/:id/estado €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
// Solo actualiza el campo estado (acciÃ³n rÃ¡pida inline)
const actualizarEstado = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });

  const { estado } = req.body;
  const estadosValidos = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado invÃ¡lido. Debe ser: ${estadosValidos.join(', ')}` });
  }

  try {
    const tarea = await prisma.tarea.update({
      where: { id },
      data:  { estado },
      include: INCLUDE_ASIGNADO,
    });
    // Notificar cambio de estado al asignado
    if (tarea.asignadoId && tarea.asignadoId !== req.usuario.id) {
      await crearNotificacion(
        tarea.asignadoId,
        `El estado de tu tarea "${tarea.titulo}" cambiÃ³ a ${tarea.estado}`,
        'ESTADO',
        tarea.id
      );
    }

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      tarea.proyectoId,
      'CAMBIO_ESTADO',
      `${req.usuario.nombre} cambiÃ³ el estado de "${tarea.titulo}" a ${tarea.estado}`
    );

    return res.json({ mensaje: 'Estado actualizado', tarea });
  } catch (error) {
    console.error('[tareas.actualizarEstado]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listar, crear, editar, eliminar, actualizarEstado };
