const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { sortTareas } = require('../utils/sort.utils');
const { esAdmin, esAdminDeArea, puedeGestionarArea } = require('../utils/permissions.utils');

const finDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
};

const finDeSemana = (fecha) => {
  const d = finDelDia(fecha);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
};

const tareaResumenSelect = {
  id: true,
  titulo: true,
  numeroActividad: true,
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
  numeroActividad: tarea.numeroActividad,
  estado: tarea.estado,
  prioridad: tarea.prioridad,
  creadoEn: tarea.creadoEn,
  completadoEn: tarea.completadoEn,
  venceEn: tarea.venceEn,
  fechaInicio: tarea.fechaInicio,
  proyecto: tarea.proyecto
});

const resumenPorProyecto = (...grupos) => {
  const proyectos = new Map();

  grupos.flat().forEach(tarea => {
    const id = tarea.proyecto?.id || 'sin-proyecto';
    const nombre = tarea.proyecto?.nombre || 'Sin proyecto';
    if (!proyectos.has(id)) {
      proyectos.set(id, { id, nombre, total: 0, hechas: 0, enProgreso: 0, pendientes: 0 });
    }
    const proyecto = proyectos.get(id);
    proyecto.total += 1;
    if (tarea.estado === 'HECHO') proyecto.hechas += 1;
    if (tarea.estado === 'EN_PROGRESO') proyecto.enProgreso += 1;
    if (tarea.estado === 'PENDIENTE') proyecto.pendientes += 1;
  });

  return [...proyectos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
};

const obtenerActividadUsuario = async (usuarioId) => {
  // Esta función se mantiene para compatibilidad con el endpoint individual /actividad
  const ahora = new Date();
  const hoyFin = finDelDia(ahora);
  const semanaFin = finDeSemana(ahora);
  const tareasDelUsuario = {
    OR: [
      { asignadoId: usuarioId },
      { creadorId: usuarioId }
    ]
  };

  const [hechas, enProgreso, faltanHoy, faltanSemana] = await Promise.all([
    prisma.tarea.findMany({
      where: { ...tareasDelUsuario, estado: 'HECHO' },
      select: tareaResumenSelect
    }),
    prisma.tarea.findMany({
      where: { ...tareasDelUsuario, estado: 'EN_PROGRESO' },
      select: tareaResumenSelect
    }),
    prisma.tarea.findMany({
      where: { ...tareasDelUsuario, estado: 'PENDIENTE' },
      select: tareaResumenSelect
    }),
    prisma.tarea.findMany({
      where: {
        ...tareasDelUsuario,
        estado: { not: 'HECHO' },
        venceEn: { gt: hoyFin, lte: semanaFin }
      },
      select: tareaResumenSelect
    })
  ]);

  const hechasResumen = sortTareas(hechas).map(resumenTarea);
  const enProgresoResumen = sortTareas(enProgreso).map(resumenTarea);
  const faltanResumen = sortTareas(faltanHoy).map(resumenTarea);
  const faltanSemanaResumen = sortTareas(faltanSemana).map(resumenTarea);

  return {
    hechasHoy: hechasResumen,
    enProgreso: enProgresoResumen,
    faltanHoy: faltanResumen,
    faltanSemana: faltanSemanaResumen,
    porProyecto: resumenPorProyecto(hechasResumen, enProgresoResumen, faltanResumen),
    totales: {
      hechasHoy: hechas.length,
      enProgreso: enProgreso.length,
      faltanHoy: faltanHoy.length,
      faltanSemana: faltanSemana.length
    }
  };
};

// Cache simple en memoria para acelerar la respuesta de la lista de usuarios
let cacheUsuarios = null;
let ultimaActualizacion = 0;
const CACHE_TTL = 30000; // 30 segundos

const obtenerFiltroUsuariosGestion = (usuario) => (
  esAdminDeArea(usuario) ? { area: usuario.area } : {}
);

// Devuelve todos los usuarios con su actividad pre-calculada de forma eficiente
const listar = async (req, res) => {
  try {
    const ahoraMs = Date.now();
    const filtroGestion = obtenerFiltroUsuariosGestion(req.usuario);
    
    // Si hay datos en caché y no han expirado, devolverlos de inmediato
    if (
      cacheUsuarios
      && (ahoraMs - ultimaActualizacion < CACHE_TTL)
      && req.usuario?.rol === 'ADMIN'
      && !esAdminDeArea(req.usuario)
    ) {
      return res.json({ usuarios: cacheUsuarios, cached: true });
    }

    const usuarios = await prisma.usuario.findMany({
      where: req.usuario?.rol === 'ADMIN' ? filtroGestion : undefined,
      orderBy: { nombre: 'asc' },
      select: {
        id:     true,
        nombre: true,
        email:  true,
        area:   true,
        rol:    true,
        creadoEn: true,
        estado: true
      },
    });

    if (req.usuario?.rol !== 'ADMIN') {
      return res.json({ usuarios });
    }

    // OPTIMIZACIÓN: Obtener solo tareas relevantes (activas o terminadas hoy) en una sola consulta
    const ahora = new Date();
    const hoyInicio = new Date(ahora);
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = finDelDia(ahora);
    const semanaFin = finDeSemana(ahora);

    const todasTareas = await prisma.tarea.findMany({
      where: {
        AND: [
          {
            OR: [
              { asignadoId: { in: usuarios.map(u => u.id) } },
              { creadorId: { in: usuarios.map(u => u.id) } }
            ]
          },
          {
            OR: [
              { estado: { in: ['PENDIENTE', 'EN_PROGRESO'] } },
              { AND: [{ estado: 'HECHO' }, { creadoEn: { gte: hoyInicio } }] }
            ]
          }
        ]
      },
      select: tareaResumenSelect,
    });

    // Procesar en memoria para cada usuario
    const usuariosConActividad = usuarios.map(usuario => {
      const id = usuario.id;
      
      // Filtrar tareas del usuario
      const hechasHoy = todasTareas.filter(t => (t.asignadoId === id || t.creadorId === id) && t.estado === 'HECHO');
      const enProgreso = todasTareas.filter(t => (t.asignadoId === id || t.creadorId === id) && t.estado === 'EN_PROGRESO');
      const faltanHoy = todasTareas.filter(t => (t.asignadoId === id || t.creadorId === id) && t.estado === 'PENDIENTE');
      const faltanSemana = todasTareas.filter(t => 
        (t.asignadoId === id || t.creadorId === id) && 
        t.estado !== 'HECHO' && 
        t.venceEn && t.venceEn > hoyFin && t.venceEn <= semanaFin
      );

      const hR = sortTareas(hechasHoy).map(resumenTarea);
      const eR = sortTareas(enProgreso).map(resumenTarea);
      const fR = sortTareas(faltanHoy).map(resumenTarea);

      return {
        ...usuario,
        actividad: {
          hechasHoy: hR,
          enProgreso: eR,
          faltanHoy: fR,
          faltanSemana: sortTareas(faltanSemana).map(resumenTarea),
          porProyecto: resumenPorProyecto(hR, eR, fR),
          totales: {
            hechasHoy: hechasHoy.length,
            enProgreso: enProgreso.length,
            faltanHoy: faltanHoy.length,
            faltanSemana: faltanSemana.length
          }
        }
      };
    });

    // Guardar en caché antes de responder
    cacheUsuarios = usuariosConActividad;
    ultimaActualizacion = Date.now();

    return res.json({ usuarios: usuariosConActividad });
  } catch (error) {
    console.error('[usuarios.listar]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const listarParaProyectos = async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { estado: 'activo' },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        email: true,
        area: true,
        rol: true,
        estado: true
      }
    });

    return res.json({ usuarios });
  } catch (error) {
    console.error('[usuarios.listarParaProyectos]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo usuario (solo ADMIN)
const crear = async (req, res) => {
  const { nombre, email, password, area, rol } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  try {
    if (esAdminDeArea(req.usuario) && !puedeGestionarArea(req.usuario, area || 'DESARROLLO')) {
      return res.status(403).json({ error: 'Solo puedes crear usuarios de tu propia área' });
    }

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: 'El correo ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { enviarInvitacion } = require('../services/correo');
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const usuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email:  email.toLowerCase().trim(),
        password: hashedPassword,
        area: area || 'DESARROLLO',
        rol:  rol  || 'MIEMBRO',
        verificado: false,
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 horas
      },
      select: { id: true, nombre: true, email: true, area: true, rol: true }
    });

    // LOG DE RASTREO DEFINITIVO
    console.log(`[INVITACIÓN]: Iniciando proceso de envío para: ${usuario.email}`);

    try {
      // Enviar email de invitación profesional
      await enviarInvitacion({ 
        nombre: usuario.nombre, 
        email: usuario.email, 
        token: verificationToken 
      });
      console.log(`🚀 [SMTP]: EL SERVIDOR CONFIRMA ENVÍO A: ${usuario.email}`);
    } catch (mailErr) {
      console.error(`❌ [SMTP]: EL SERVIDOR FALLÓ AL ENVIAR A: ${usuario.email}`, mailErr.message);
      // No lanzamos el error para que el usuario se cree, pero lo registramos
    }

    // Limpiar caché al crear usuario
    cacheUsuarios = null;
    return res.status(201).json({ mensaje: 'Usuario creado (revisa logs de correo)', usuario });
  } catch (error) {
    console.error('[usuarios.crear]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Editar usuario (solo ADMIN)
const editar = async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, email, password, area, rol } = req.body;

  try {
    const objetivo = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, area: true }
    });

    if (!objetivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (esAdminDeArea(req.usuario) && !puedeGestionarArea(req.usuario, objetivo.area)) {
      return res.status(403).json({ error: 'Solo puedes editar usuarios de tu propia área' });
    }

    if (esAdminDeArea(req.usuario) && area && !puedeGestionarArea(req.usuario, area)) {
      return res.status(403).json({ error: 'No puedes mover usuarios a otra área' });
    }

    const data = {
      nombre: nombre?.trim(),
      email:  email?.toLowerCase().trim(),
      area,
      rol
    };

    // Si envía password, se encripta
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, area: true, rol: true }
    });

    // Limpiar caché al editar usuario
    cacheUsuarios = null;
    return res.json({ mensaje: 'Usuario actualizado', usuario });
  } catch (error) {
    console.error('[usuarios.editar]', error);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Eliminar usuario (solo ADMIN)
const eliminar = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    // 1. No permitir que un admin se borre a sí mismo
    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    // 2. Verificar que el usuario existe
    const usuarioABorrar = await prisma.usuario.findUnique({ where: { id } });
    if (!usuarioABorrar) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (esAdminDeArea(req.usuario) && !puedeGestionarArea(req.usuario, usuarioABorrar.area)) {
      return res.status(403).json({ error: 'Solo puedes eliminar usuarios de tu propia área' });
    }

    // 3. Manejo de dependencias (Integridad Referencial)
    // Usamos una transacción para asegurar que todo se limpie o nada
    await prisma.$transaction(async (tx) => {
      // A. Desasignar tareas (poner asignadoId a null)
      await tx.tarea.updateMany({
        where: { asignadoId: id },
        data: { asignadoId: null }
      });

      // B. Reasignar proyectos creados al administrador que ejecuta la acción
      await tx.proyecto.updateMany({
        where: { creadorId: id },
        data: { creadorId: req.usuario.id }
      });

      // C. Eliminar logs de actividad del usuario
      await tx.logActividad.deleteMany({
        where: { usuarioId: id }
      });

      // D. Eliminar adjuntos subidos por el usuario
      await tx.adjunto.deleteMany({
        where: { usuarioId: id }
      });

      // E. Eliminar notificaciones (aunque tengan onDelete: Cascade, lo hacemos explícito o confiamos en el esquema)
      await tx.notificacion.deleteMany({
        where: { usuarioId: id }
      });

      // F. Eliminar comentarios del usuario
      await tx.comentario.deleteMany({
        where: { autorId: id }
      });

      // G. Finalmente, eliminar al usuario
      await tx.usuario.delete({ where: { id } });
    });

    // Limpiar caché al eliminar usuario
    cacheUsuarios = null;
    return res.json({ mensaje: 'Usuario eliminado correctamente y sus dependencias han sido gestionadas' });
  } catch (error) {
    console.error('[usuarios.eliminar]', error);
    return res.status(500).json({ error: 'Error al eliminar usuario. Puede tener dependencias complejas.' });
  }
};

// Cambiar estado de usuario (solo ADMIN)
const toggleEstado = async (req, res) => {
  const id = parseInt(req.params.id);
  const { estado } = req.body; // 'activo' o 'inactivo'

  if (!['activo', 'inactivo'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const objetivo = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, area: true }
    });

    if (!objetivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (esAdminDeArea(req.usuario) && !puedeGestionarArea(req.usuario, objetivo.area)) {
      return res.status(403).json({ error: 'Solo puedes cambiar el estado de usuarios de tu propia área' });
    }

    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { estado },
      select: { id: true, nombre: true, estado: true }
    });

    // Limpiar caché al cambiar estado
    cacheUsuarios = null;
    return res.json({ mensaje: `Usuario marcado como ${estado}`, usuario });
  } catch (error) {
    console.error('[usuarios.toggleEstado]', error);
    return res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
};

const actividad = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, area: true }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (esAdminDeArea(req.usuario) && !puedeGestionarArea(req.usuario, usuario.area)) {
      return res.status(403).json({ error: 'Solo puedes consultar actividad de usuarios de tu propia área' });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({ actividad: await obtenerActividadUsuario(id) });
  } catch (error) {
    console.error('[usuarios.actividad]', error);
    return res.status(500).json({ error: 'Error al obtener actividad del usuario' });
  }
};

module.exports = { listar, listarParaProyectos, crear, editar, eliminar, toggleEstado, actividad };
