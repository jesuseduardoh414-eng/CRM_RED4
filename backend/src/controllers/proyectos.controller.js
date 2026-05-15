// Controlador de Proyectos
// ADMIN †’ ve todos los proyectos
// MIEMBRO †’ solo los proyectos donde tiene tareas asignadas

const prisma = require('../lib/prisma');
const { registrarActividad } = require('../utils/logger');

// Campos comunes del include
const INCLUDE_PROYECTO = {
  creador: { select: { id: true, nombre: true, area: true } },
  miembros: { select: { id: true, nombre: true, email: true, area: true, rol: true } },
  _count:  { select: { tareas: true } },
};

const parseJsonArray = (value) => {
  if (!value) return [];
  return typeof value === 'string' ? JSON.parse(value) : value;
};

const normalizarIds = (ids) => [...new Set(ids.map(id => Number(id)).filter(id => !Number.isNaN(id)))];

const areasDeProyecto = (area) => (area || 'DESARROLLO')
  .split(',')
  .map(a => a.trim())
  .filter(Boolean);

const getRangoProyecto = (fechaInicio, fechaFin) => {
  const inicio = fechaInicio ? new Date(fechaInicio) : new Date();
  const fin = fechaFin ? new Date(fechaFin) : new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  if (fechaFin && /^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    fin.setDate(fin.getDate() + 1);
  }
  return { inicio, fin };
};

const validarMiembrosPorArea = async (ids, area) => {
  if (ids.length === 0) return { usuarios: [], invalidos: [] };
  const areas = areasDeProyecto(area);
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true, area: true, rol: true }
  });
  const idsValidos = new Set(
    usuarios
      .filter(u => u.rol === 'ADMIN' || areas.includes(u.area))
      .map(u => u.id)
  );
  return {
    usuarios,
    invalidos: ids.filter(id => !idsValidos.has(id)),
  };
};

const consultarOcupados = async ({ ids, inicio, fin, proyectoId = null }) => {
  if (ids.length === 0) return [];
  const admins = await prisma.usuario.findMany({
    where: { id: { in: ids }, rol: 'ADMIN' },
    select: { id: true }
  });
  const adminIds = new Set(admins.map(u => u.id));
  const idsRevisar = ids.filter(id => !adminIds.has(id));
  if (idsRevisar.length === 0) return [];

  const [eventos, proyectos] = await Promise.all([
    prisma.evento.findMany({
      where: {
        proyectoId: proyectoId ? { not: proyectoId } : undefined,
        OR: [
          { usuarioId: { in: idsRevisar } },
          { invitados: { some: { usuarioId: { in: idsRevisar }, estado: 'aceptado' } } }
        ],
        fechaInicio: { lt: fin },
        fechaFin: { gt: inicio }
      },
      select: { titulo: true, usuarioId: true }
    }),
    prisma.proyecto.findMany({
      where: {
        id: proyectoId ? { not: proyectoId } : undefined,
        estado: { not: 'CERRADO' },
        miembros: { some: { id: { in: idsRevisar } } },
        fechaInicio: { lt: fin },
        OR: [
          { fechaFin: null },
          { fechaFin: { gt: inicio } }
        ]
      },
      select: {
        nombre: true,
        miembros: { where: { id: { in: idsRevisar } }, select: { id: true } }
      }
    })
  ]);

  return [
    ...eventos.map(e => ({ usuarioId: e.usuarioId, titulo: e.titulo })),
    ...proyectos.flatMap(p => p.miembros.map(m => ({ usuarioId: m.id, titulo: `Proyecto: ${p.nombre}` }))),
  ];
};

const sincronizarCalendarioProyecto = async ({ proyecto, ids }) => {
  await prisma.evento.deleteMany({ where: { proyectoId: proyecto.id } });

  if (ids.length === 0 || !proyecto.fechaInicio || !proyecto.fechaFin) return;
  const fechaFinEvento = new Date(proyecto.fechaFin);
  if (
    fechaFinEvento.getHours() === 0 &&
    fechaFinEvento.getMinutes() === 0 &&
    fechaFinEvento.getSeconds() === 0
  ) {
    fechaFinEvento.setDate(fechaFinEvento.getDate() + 1);
  }

  await prisma.evento.createMany({
    data: ids.map(usuarioId => ({
      usuarioId,
      titulo: `Proyecto: ${proyecto.nombre}`,
      descripcion: proyecto.descripcion || null,
      tipo: 'dia_completo',
      fechaInicio: proyecto.fechaInicio,
      fechaFin: fechaFinEvento,
      todoElDia: true,
      color: '#2563eb',
      proyectoId: proyecto.id,
      creadoPorId: proyecto.creadorId,
    }))
  });
};

// €€ GET /api/proyectos €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
// ADMIN: todos los proyectos
// MIEMBRO: solo proyectos donde es miembro explÃ­cito
const listar = async (req, res) => {
  try {
    const esAdmin = req.usuario.rol === 'ADMIN';

    const where = esAdmin
      ? {}
      : { miembros: { some: { id: req.usuario.id } } };

    const proyectos = await prisma.proyecto.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: {
        ...INCLUDE_PROYECTO,
        tareas: {
          select: { estado: true }
        }
      },
    });

    const proyectosConProgreso = proyectos.map(p => {
      const total = p.tareas.length;
      const hechas = p.tareas.filter(t => t.estado === 'HECHO').length;
      const progreso = total > 0 ? Math.round((hechas / total) * 100) : 0;
      
      // Eliminamos el array de tareas para no sobrecargar la respuesta JSON
      const { tareas, ...resto } = p;
      return { ...resto, progreso };
    });

    return res.json({ proyectos: proyectosConProgreso, filtradoPorUsuario: !esAdmin });
  } catch (error) {
    console.error('[proyectos.listar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ GET /api/proyectos/:id/equipo €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
// Devuelve los miembros asignados oficialmente al proyecto
const equipo = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });

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

// €€ POST /api/proyectos €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const crear = async (req, res) => {
  const { nombre, descripcion, estado, area, fechaInicio, fechaFin, primerComentario, miembrosIds } = req.body;
  const archivos = req.files;

  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
  }

  try {
    // Procesar IDs de miembros (pueden venir como string JSON en multipart)
    const ids = normalizarIds(parseJsonArray(miembrosIds));
    const idsProyecto = ids.includes(req.usuario.id) ? ids : [...ids, req.usuario.id];

    const areaProyecto = area || 'DESARROLLO';
    const { invalidos } = await validarMiembrosPorArea(ids, areaProyecto);
    if (invalidos.length > 0) {
      return res.status(400).json({ error: 'Solo puedes asignar miembros de las areas seleccionadas' });
    }

    const { inicio, fin } = getRangoProyecto(fechaInicio, fechaFin);
    const ocupados = await consultarOcupados({ ids, inicio, fin });
    if (ocupados.length > 0) {
      const usuariosOcupados = await prisma.usuario.findMany({
        where: { id: { in: [...new Set(ocupados.map(o => o.usuarioId))] } },
        select: { nombre: true }
      });
      return res.status(400).json({
        error: `No se puede asignar el proyecto: ${usuariosOcupados.map(u => u.nombre).join(', ')} tiene agenda ocupada`
      });
    }

    const proyecto = await prisma.proyecto.create({
      data: {
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        estado:      estado || 'ACTIVO',
        area:        areaProyecto,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        fechaFin:    fechaFin ? new Date(fechaFin) : null,
        creadorId:   req.usuario.id,
        miembros: {
          connect: idsProyecto.map(id => ({ id: Number(id) }))
        }
      },
      include: INCLUDE_PROYECTO,
    });

    await sincronizarCalendarioProyecto({ proyecto, ids });

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
      `${req.usuario.nombre} creó el proyecto "${proyecto.nombre}" con ${idsProyecto.length} miembros`
    );

    return res.status(201).json({ mensaje: 'Proyecto creado', proyecto });
  } catch (error) {
    console.error('[proyectos.crear]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// €€ PUT /api/proyectos/:id €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const editar = async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, descripcion, estado, area, fechaInicio, fechaFin, miembrosIds } = req.body;
  if (isNaN(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });

  try {
    const existente = await prisma.proyecto.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Proyecto no encontrado' });

    let dataUpdate = {
      ...(nombre      && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
      ...(estado      && { estado }),
      ...(area        && { area }),
      ...(fechaInicio && { fechaInicio: new Date(fechaInicio) }),
      ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
    };

    // Actualizar miembros si se envÃ­an
    let ids = null;
    if (miembrosIds) {
      ids = normalizarIds(parseJsonArray(miembrosIds));
      const idsProyecto = ids.includes(existente.creadorId) ? ids : [...ids, existente.creadorId];
      const areaProyecto = area || existente.area;
      const { invalidos } = await validarMiembrosPorArea(ids, areaProyecto);
      if (invalidos.length > 0) {
        return res.status(400).json({ error: 'Solo puedes asignar miembros de las areas seleccionadas' });
      }

      const { inicio, fin } = getRangoProyecto(fechaInicio || existente.fechaInicio, fechaFin !== undefined ? fechaFin : existente.fechaFin);
      const ocupados = await consultarOcupados({ ids, inicio, fin, proyectoId: id });
      if (ocupados.length > 0) {
        const usuariosOcupados = await prisma.usuario.findMany({
          where: { id: { in: [...new Set(ocupados.map(o => o.usuarioId))] } },
          select: { nombre: true }
        });
        return res.status(400).json({
          error: `No se puede asignar el proyecto: ${usuariosOcupados.map(u => u.nombre).join(', ')} tiene agenda ocupada`
        });
      }
      dataUpdate.miembros = {
        set: idsProyecto.map(mid => ({ id: Number(mid) }))
      };
    }

    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: dataUpdate,
      include: INCLUDE_PROYECTO,
    });

    if (ids) {
      await sincronizarCalendarioProyecto({ proyecto, ids });
    }

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

// €€ DELETE /api/proyectos/:id €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const eliminar = async (req, res) => {
  const id = parseInt(req.params.id);
  if (req.usuario.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar proyectos' });
  }
  if (isNaN(id)) return res.status(400).json({ error: 'ID invÃ¡lido' });

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
