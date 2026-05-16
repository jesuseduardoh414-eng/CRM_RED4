const prisma = require('../lib/prisma');
const { sortTareas } = require('../utils/sort.utils');
const { buildScopeProyectoParaAdmin, esAdminDeArea } = require('../utils/permissions.utils');

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

const inicioDeSemana = (fecha) => {
  const d = new Date(fecha);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const tareaResumenSelect = {
  id: true,
  titulo: true,
  estado: true,
  prioridad: true,
  creadoEn: true,
  completadoEn: true,
  venceEn: true,
  fechaInicio: true,
  asignadoId: true,
  creadorId: true,
  proyecto: {
    select: { id: true, nombre: true }
  }
};

const resumenTarea = (tarea) => ({
  id: tarea.id,
  titulo: tarea.titulo,
  estado: tarea.estado,
  prioridad: tarea.prioridad,
  creadoEn: tarea.creadoEn,
  completadoEn: tarea.completadoEn,
  venceEn: tarea.venceEn,
  fechaInicio: tarea.fechaInicio,
  proyecto: tarea.proyecto
});

const getTopUsuariosProductividad = async (usuario) => {
  const hoy = new Date();
  const inicioSemanaActual = inicioDeSemana(hoy);
  const semanasAnalizadas = 4;
  const inicioVentana = new Date(inicioSemanaActual);
  inicioVentana.setDate(inicioVentana.getDate() - ((semanasAnalizadas - 1) * 7));
  const filtroAreaUsuarios = esAdminDeArea(usuario) ? { area: usuario.area } : {};
  const scopeProyecto = buildScopeProyectoParaAdmin(usuario);

  const [miembros, tareasHechas] = await Promise.all([
    prisma.usuario.findMany({
      where: { rol: 'MIEMBRO', ...filtroAreaUsuarios },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, area: true }
    }),
    prisma.tarea.findMany({
      where: {
        estado: 'HECHO',
        completadoEn: { gte: inicioVentana },
        ...(scopeProyecto ? { proyecto: scopeProyecto } : {})
      },
      select: {
        id: true,
        asignadoId: true,
        creadorId: true,
        completadoEn: true
      }
    })
  ]);

  return miembros
    .map((miembro) => {
      const hechas = tareasHechas.filter((tarea) => tarea.asignadoId === miembro.id || tarea.creadorId === miembro.id);
      const hechasSemanaActual = hechas.filter((tarea) => tarea.completadoEn >= inicioSemanaActual).length;
      const promedioSemanal = Number((hechas.length / semanasAnalizadas).toFixed(1));

      return {
        id: miembro.id,
        nombre: miembro.nombre,
        area: miembro.area,
        promedioSemanal,
        hechasSemanaActual,
        totalVentana: hechas.length
      };
    })
    .sort((a, b) =>
      b.promedioSemanal - a.promedioSemanal
      || b.hechasSemanaActual - a.hechasSemanaActual
      || a.nombre.localeCompare(b.nombre))
    .slice(0, 5);
};

const getActividadMiembros = async (usuario) => {
  const ahora = new Date();
  const hoyFin = finDelDia(ahora);
  const semanaFin = finDeSemana(ahora);
  const filtroAreaUsuarios = esAdminDeArea(usuario) ? { area: usuario.area } : {};
  const scopeProyecto = buildScopeProyectoParaAdmin(usuario);

  const miembros = await prisma.usuario.findMany({
    where: { rol: 'MIEMBRO', ...filtroAreaUsuarios },
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

    const hoyInicio = new Date(ahora);
    hoyInicio.setHours(0,0,0,0);

    const [hechas, hechasHoy, enProgreso, faltanHoy, faltanSemana, todasConFecha] = await Promise.all([
      prisma.tarea.findMany({
        where: { ...tareasDelUsuario, estado: 'HECHO', ...(scopeProyecto ? { proyecto: scopeProyecto } : {}) },
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: { ...tareasDelUsuario, estado: 'HECHO', completadoEn: { gte: hoyInicio }, ...(scopeProyecto ? { proyecto: scopeProyecto } : {}) },
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: { ...tareasDelUsuario, estado: 'EN_PROGRESO', ...(scopeProyecto ? { proyecto: scopeProyecto } : {}) },
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: { ...tareasDelUsuario, estado: 'PENDIENTE', ...(scopeProyecto ? { proyecto: scopeProyecto } : {}) },
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: {
          ...tareasDelUsuario,
          estado: { not: 'HECHO' },
          venceEn: { gt: hoyFin, lte: semanaFin },
          ...(scopeProyecto ? { proyecto: scopeProyecto } : {})
        },
        select: tareaResumenSelect
      }),
      prisma.tarea.findMany({
        where: { ...tareasDelUsuario, ...(scopeProyecto ? { proyecto: scopeProyecto } : {}) },
        select: tareaResumenSelect
      })
    ]);

    return {
      id: miembro.id,
      nombre: miembro.nombre,
      area: miembro.area,
      hechasHoy: sortTareas(hechasHoy).map(resumenTarea),
      enProgreso: sortTareas(enProgreso).map(resumenTarea),
      faltanHoy: sortTareas(faltanHoy).map(resumenTarea),
      faltanSemana: sortTareas(faltanSemana).map(resumenTarea),
      todasConFecha: todasConFecha.map(resumenTarea),
      totales: {
        hechasHoy: hechasHoy.length,
        enProgreso: enProgreso.length,
        faltanHoy: faltanHoy.length,
        faltanSemana: faltanSemana.length,
        totalHechas: hechas.length
      }
    };
  }));
};

const getAdminStats = async (req, res) => {
  try {
    const scopeProyecto = buildScopeProyectoParaAdmin(req.usuario);

    // 1. Estadísticas de Proyectos
    const totalProyectos = await prisma.proyecto.count({ where: scopeProyecto || undefined });
    const proyectosPorEstado = await prisma.proyecto.groupBy({
      by: ['estado'],
      where: scopeProyecto || undefined,
      _count: true
    });

    // 2. Estadísticas de Tareas
    const totalTareas = await prisma.tarea.count({ where: scopeProyecto ? { proyecto: scopeProyecto } : undefined });
    const tareasPorEstado = await prisma.tarea.groupBy({
      by: ['estado'],
      where: scopeProyecto ? { proyecto: scopeProyecto } : undefined,
      _count: true
    });

    // 3. Top Usuarios (Productividad)
    // Usuarios con más tareas completadas
    const topUsuarios = await getTopUsuariosProductividad(req.usuario);

    // 4. Actividad Reciente
    const actividadReciente = await prisma.logActividad.findMany({
      take: 8,
      where: scopeProyecto ? { proyecto: scopeProyecto } : undefined,
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: { select: { nombre: true, area: true } }
      }
    });

    // 5. Proyectos con más progreso (Top 5 activos)
    const proyectosActivos = await prisma.proyecto.findMany({
      where: { estado: 'ACTIVO', ...(scopeProyecto || {}) },
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

    const actividadMiembros = await getActividadMiembros(req.usuario);

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
