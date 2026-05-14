const prisma = require('../lib/prisma');

const inicioDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
};

const finDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
};

const finDeSemana = (fecha) => {
  const d = finDelDia(fecha);
  const diasHastaDomingo = 6 - d.getDay();
  d.setDate(d.getDate() + diasHastaDomingo);
  return d;
};

const tareaResumenSelect = {
  id: true,
  titulo: true,
  estado: true,
  prioridad: true,
  venceEn: true,
  fechaInicio: true,
  proyecto: {
    select: { id: true, nombre: true }
  }
};

const resumenTarea = (tarea) => ({
  id: tarea.id,
  titulo: tarea.titulo,
  estado: tarea.estado,
  prioridad: tarea.prioridad,
  venceEn: tarea.venceEn,
  fechaInicio: tarea.fechaInicio,
  proyecto: tarea.proyecto
});

const getActividadMiembros = async () => {
  const ahora = new Date();
  const hoyInicio = inicioDelDia(ahora);
  const hoyFin = finDelDia(ahora);
  const semanaFin = finDeSemana(ahora);

  const miembros = await prisma.usuario.findMany({
    where: { rol: 'MIEMBRO' },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, area: true }
  });

  return Promise.all(miembros.map(async (miembro) => {
    const tareasDelUsuario = {
      OR: [
        { asignadoId: miembro.id },
        { creadorId: miembro.id }
      ]
    };

    const [logsHechasHoy, enProgreso, faltanHoy, faltanSemana] = await Promise.all([
      prisma.logActividad.findMany({
        where: {
          accion: 'CAMBIO_ESTADO',
          creadoEn: { gte: hoyInicio, lte: hoyFin },
          descripcion: { contains: 'HECHO' },
          usuarioId: miembro.id,
          tarea: { isNot: null }
        },
        orderBy: { creadoEn: 'desc' },
        include: {
          tarea: { select: tareaResumenSelect }
        }
      }),
      prisma.tarea.findMany({
        where: {
          ...tareasDelUsuario,
          estado: 'EN_PROGRESO'
        },
        orderBy: [{ venceEn: 'asc' }, { creadoEn: 'desc' }],
        take: 6,
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: {
          ...tareasDelUsuario,
          estado: 'PENDIENTE'
        },
        orderBy: [{ prioridad: 'desc' }, { venceEn: 'asc' }],
        take: 6,
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: {
          ...tareasDelUsuario,
          estado: { not: 'HECHO' },
          venceEn: { gt: hoyFin, lte: semanaFin }
        },
        orderBy: [{ venceEn: 'asc' }, { prioridad: 'desc' }],
        take: 6,
        select: tareaResumenSelect
      })
    ]);

    const tareasHechasHoy = [];
    const vistas = new Set();
    logsHechasHoy.forEach(log => {
      if (log.tarea && !vistas.has(log.tarea.id)) {
        vistas.add(log.tarea.id);
        tareasHechasHoy.push(resumenTarea(log.tarea));
      }
    });

    return {
      id: miembro.id,
      nombre: miembro.nombre,
      area: miembro.area,
      hechasHoy: tareasHechasHoy,
      enProgreso: enProgreso.map(resumenTarea),
      faltanHoy: faltanHoy.map(resumenTarea),
      faltanSemana: faltanSemana.map(resumenTarea),
      totales: {
        hechasHoy: tareasHechasHoy.length,
        enProgreso: enProgreso.length,
        faltanHoy: faltanHoy.length,
        faltanSemana: faltanSemana.length
      }
    };
  }));
};

const getAdminStats = async (req, res) => {
  try {
    // 1. Estadísticas de Proyectos
    const totalProyectos = await prisma.proyecto.count();
    const proyectosPorEstado = await prisma.proyecto.groupBy({
      by: ['estado'],
      _count: true
    });

    // 2. Estadísticas de Tareas
    const totalTareas = await prisma.tarea.count();
    const tareasPorEstado = await prisma.tarea.groupBy({
      by: ['estado'],
      _count: true
    });

    // 3. Top Usuarios (Productividad)
    // Usuarios con más tareas completadas
    const topUsuarios = await prisma.usuario.findMany({
      take: 5,
      select: {
        id: true,
        nombre: true,
        area: true,
        _count: {
          select: {
            tareasAsignadas: {
              where: { estado: 'HECHO' }
            }
          }
        }
      },
      orderBy: {
        tareasAsignadas: {
          _count: 'desc'
        }
      }
    });

    // 4. Actividad Reciente
    const actividadReciente = await prisma.logActividad.findMany({
      take: 8,
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: { select: { nombre: true, area: true } }
      }
    });

    // 5. Proyectos con más progreso (Top 5 activos)
    const proyectosActivos = await prisma.proyecto.findMany({
      where: { estado: 'ACTIVO' },
      take: 5,
      include: {
        _count: { select: { tareas: true } },
        tareas: {
          where: { estado: 'HECHO' },
          select: { id: true }
        }
      }
    });

    const proyectosProgreso = proyectosActivos.map(p => {
      const total = p._count.tareas;
      const completas = p.tareas.length;
      return {
        id: p.id,
        nombre: p.nombre,
        total,
        completas,
        porcentaje: total > 0 ? Math.round((completas / total) * 100) : 0
      };
    }).sort((a, b) => b.porcentaje - a.porcentaje);

    const actividadMiembros = await getActividadMiembros();

    res.json({
      proyectos: {
        total: totalProyectos,
        estados: proyectosPorEstado
      },
      tareas: {
        total: totalTareas,
        estados: tareasPorEstado
      },
      topUsuarios,
      actividadReciente,
      proyectosProgreso,
      actividadMiembros
    });

  } catch (error) {
    console.error('[stats.getAdminStats]', error);
    res.status(500).json({ error: 'Error al generar estadísticas' });
  }
};

module.exports = { getAdminStats };
