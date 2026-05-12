// Controlador de Proyectos
// ADMIN → ve todos los proyectos
// MIEMBRO → solo los proyectos donde tiene tareas asignadas

const prisma = require('../lib/prisma');
const { registrarActividad } = require('../utils/logger');

// Campos comunes del include
const INCLUDE_PROYECTO = {
  creador: { select: { id: true, nombre: true, area: true } },
  miembros: { select: { id: true, nombre: true, email: true, area: true, rol: true } },
  _count:  { select: { tareas: true } },
};

// ── GET /api/proyectos ──────────────────────────────────────────────────────
// ADMIN: todos los proyectos
// MIEMBRO: solo proyectos donde es miembro explícito
const listar = async (req, res) => {
  try {
    const esAdmin = req.usuario.rol === 'ADMIN';

    // Para miembro: filtrar por la relación miembros
    const where = esAdmin
      ? {}
      : { miembros: { some: { id: req.usuario.id } } };

    const proyectos = await prisma.proyecto.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: INCLUDE_PROYECTO,
    });

    return res.json({ proyectos, filtradoPorUsuario: !esAdmin });
  } catch (error) {
    console.error('[proyectos.listar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── GET /api/proyectos/:id/equipo ───────────────────────────────────────────
// Devuelve los miembros asignados oficialmente al proyecto
const equipo = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: { 
        creador: { select: { id: true, nombre: true, area: true, rol: true, email: true } },
        miembros: {
          select: {
            id: true, nombre: true, email: true, area: true, rol: true,
            // Contar sus tareas en este proyecto por estado
            tareasAsignadas: {
              where: { proyectoId: id },
              select: { estado: true },
            },
          }
        }
      },
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Enriquecer con conteos de estado
    const miembrosConStats = proyecto.miembros.map(m => ({
      id:        m.id,
      nombre:    m.nombre,
      email:     m.email,
      area:      m.area,
      rol:       m.rol,
      tareas: {
        total:      m.tareasAsignadas.length,
        pendientes: m.tareasAsignadas.filter(t => t.estado === 'PENDIENTE').length,
        enProgreso: m.tareasAsignadas.filter(t => t.estado === 'EN_PROGRESO').length,
        hechas:     m.tareasAsignadas.filter(t => t.estado === 'HECHO').length,
      },
    }));

    return res.json({ proyecto, equipo: miembrosConStats });
  } catch (error) {
    console.error('[proyectos.equipo]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /api/proyectos ─────────────────────────────────────────────────────
const crear = async (req, res) => {
  const { nombre, descripcion, estado, area, fechaInicio, fechaFin, primerComentario, miembrosIds } = req.body;
  const archivos = req.files;

  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
  }

  try {
    // Procesar IDs de miembros (pueden venir como string JSON en multipart)
    let ids = [];
    if (miembrosIds) {
      ids = typeof miembrosIds === 'string' ? JSON.parse(miembrosIds) : miembrosIds;
    }
    // Asegurar que el creador sea miembro
    if (!ids.includes(req.usuario.id)) ids.push(req.usuario.id);

    const proyecto = await prisma.proyecto.create({
      data: {
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        estado:      estado || 'ACTIVO',
        area:        area || 'DESARROLLO',
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        fechaFin:    fechaFin ? new Date(fechaFin) : null,
        creadorId:   req.usuario.id,
        miembros: {
          connect: ids.map(id => ({ id: Number(id) }))
        }
      },
      include: INCLUDE_PROYECTO,
    });

    // 1. Crear comentario inicial si existe
    if (primerComentario && primerComentario.trim() !== '') {
      await prisma.comentario.create({
        data: {
          contenido: primerComentario.trim(),
          proyectoId: proyecto.id,
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
        proyectoId: proyecto.id,
        usuarioId: req.usuario.id
      }));

      await prisma.adjunto.createMany({
        data: adjuntosData
      });
    }

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      proyecto.id,
      'CREAR_PROYECTO',
      `${req.usuario.nombre} creó el proyecto "${proyecto.nombre}" con ${ids.length} miembros`
    );

    return res.status(201).json({ mensaje: 'Proyecto creado', proyecto });
  } catch (error) {
    console.error('[proyectos.crear]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── PUT /api/proyectos/:id ──────────────────────────────────────────────────
const editar = async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, descripcion, estado, area, fechaInicio, fechaFin, miembrosIds } = req.body;
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const existente = await prisma.proyecto.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Proyecto no encontrado' });

    let dataUpdate = {
      ...(nombre      && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
      ...(estado      && { estado }),
    };

    // Actualizar miembros si se envían
    if (miembrosIds) {
      const ids = typeof miembrosIds === 'string' ? JSON.parse(miembrosIds) : miembrosIds;
      dataUpdate.miembros = {
        set: ids.map(mid => ({ id: Number(mid) }))
      };
    }

    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: dataUpdate,
      include: INCLUDE_PROYECTO,
    });

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      proyecto.id,
      'EDITAR_PROYECTO',
      `${req.usuario.nombre} actualizó el proyecto "${proyecto.nombre}"`
    );

    return res.json({ mensaje: 'Proyecto actualizado', proyecto });
  } catch (error) {
    console.error('[proyectos.editar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── DELETE /api/proyectos/:id ───────────────────────────────────────────────
const eliminar = async (req, res) => {
  const id = parseInt(req.params.id);
  if (req.usuario.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar proyectos' });
  }
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const existente = await prisma.proyecto.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Proyecto no encontrado' });

    await prisma.tarea.deleteMany({ where: { proyectoId: id } });
    await prisma.proyecto.delete({ where: { id } });

    // Registrar en el Log de Actividad
    await registrarActividad(
      req.usuario.id,
      id,
      'ELIMINAR_PROYECTO',
      `${req.usuario.nombre} eliminó el proyecto "${existente.nombre}"`
    );
    return res.json({ mensaje: 'Proyecto eliminado correctamente' });
  } catch (error) {
    console.error('[proyectos.eliminar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listar, equipo, crear, editar, eliminar };
