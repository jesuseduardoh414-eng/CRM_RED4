const prisma = require('../lib/prisma');

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
      proyectosProgreso
    });

  } catch (error) {
    console.error('[stats.getAdminStats]', error);
    res.status(500).json({ error: 'Error al generar estadísticas' });
  }
};

module.exports = { getAdminStats };
