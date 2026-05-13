// Controlador de Agenda Personal y Compartida
const prisma = require('../lib/prisma');

// ── Utilidad: expandir evento recurrente en ocurrencias ─────────────────────
function expandirRecurrente(evento, desdeDate, hastaDate) {
  if (!evento.esRecurrente || !evento.patronRecurrencia) return [];
  try {
    const patron = JSON.parse(evento.patronRecurrencia);
    const diasSemana = patron.dias || []; // [0..6] domingo=0
    const horaInicio = patron.horaInicio || '00:00';
    const horaFin    = patron.horaFin    || '23:59';
    const finRecurr  = evento.fechaFinRecurr ? new Date(evento.fechaFinRecurr) : hastaDate;

    const desde = new Date(Math.max(desdeDate.getTime(), new Date(evento.fechaInicio).getTime()));
    const hasta = new Date(Math.min(hastaDate.getTime(), finRecurr.getTime()));

    const ocurrencias = [];
    const cursor = new Date(desde);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= hasta) {
      const diaSemana = cursor.getDay(); // 0=domingo
      if (diasSemana.includes(diaSemana)) {
        const [hi, mi] = horaInicio.split(':').map(Number);
        const [hf, mf] = horaFin.split(':').map(Number);
        const fi = new Date(cursor); fi.setHours(hi, mi, 0, 0);
        const ff = new Date(cursor); ff.setHours(hf, mf, 0, 0);
        ocurrencias.push({
          ...evento,
          id: `${evento.id}_${cursor.toISOString().split('T')[0]}`,
          fechaInicio: fi,
          fechaFin:    ff,
          esOcurrencia: true,
          eventoBaseId: evento.id,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return ocurrencias;
  } catch { return []; }
}

// ── GET /api/agenda ─────────────────────────────────────────────────────────
// Listar eventos del usuario (propios + invitados)
const listar = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  const usuarioId = req.usuario.id;

  try {
    const desde = fecha_inicio ? new Date(fecha_inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const hasta = fecha_fin   ? new Date(fecha_fin)   : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

    const where = {
      OR: [
        { usuarioId },
        { esGlobal: true },
        { invitados: { some: { usuarioId } } }
      ]
    };

    // Traer eventos normales en el rango + todos los recurrentes vigentes
    const [eventosNormales, eventosRecurrentes] = await Promise.all([
      // Eventos normales dentro del rango
      prisma.evento.findMany({
        where: { AND: [ where, { fechaInicio: { gte: desde, lte: hasta } } ] },
        include: {
          creador:   { select: { id: true, nombre: true, email: true } },
          invitados: { include: { usuario: { select: { id: true, nombre: true, email: true } } } },
          proyecto:  { select: { id: true, nombre: true } }
        },
        orderBy: { fechaInicio: 'asc' },
      }),
      // Eventos recurrentes (cualquier fecha inicio, los expandimos en JS)
      prisma.evento.findMany({
        where: { AND: [ where, { patronRecurrencia: { not: null } } ] },
        include: {
          creador:   { select: { id: true, nombre: true, email: true } },
          invitados: { include: { usuario: { select: { id: true, nombre: true, email: true } } } },
          proyecto:  { select: { id: true, nombre: true } }
        },
      }),
    ]);

    // Eliminar duplicados (eventos que son normales Y tienen patrón)
    const idsNormales = new Set(eventosNormales.map(e => e.id));
    const soloRecurrentes = eventosRecurrentes.filter(e => !idsNormales.has(e.id));

    // Filtrar normales que NO son recurrentes (no tienen patrón)
    const normales = eventosNormales.filter(e => !e.patronRecurrencia);

    // Expandir recurrentes en el rango
    const expandidos = soloRecurrentes.flatMap(e => expandirRecurrente(e, desde, hasta));

    const resultado = [...normales, ...expandidos].sort(
      (a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)
    );

    return res.json({ eventos: resultado });
  } catch (error) {
    console.error('[agenda.listar]', error);
    return res.status(500).json({ error: 'Error al listar la agenda' });
  }
};

// ── PUT /api/agenda/:id ─────────────────────────────────────────────────────
const editar = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;
  const { 
    titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, color,
    alerta_minutos, es_compartido, es_global, proyecto_id,
    es_recurrente, patron_recurrencia, fecha_fin_recurrencia
  } = req.body;

  try {
    const existente = await prisma.evento.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ error: 'Evento no encontrado' });
    if (existente.usuarioId !== usuarioId && existente.creadoPorId !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este evento' });
    }

    const updateData = {
      titulo:           titulo       !== undefined ? titulo       : existente.titulo,
      descripcion:      descripcion  !== undefined ? descripcion  : existente.descripcion,
      tipo:             tipo         || existente.tipo,
      fechaInicio:      fecha_inicio ? new Date(fecha_inicio)    : existente.fechaInicio,
      fechaFin:         fecha_fin    ? new Date(fecha_fin)        : existente.fechaFin,
      todoElDia:        todo_el_dia  !== undefined ? todo_el_dia  : existente.todoElDia,
      color:            color        !== undefined ? color        : existente.color,
      alertaMinutos:    alerta_minutos !== undefined ? (alerta_minutos !== null ? parseInt(alerta_minutos) : null) : existente.alertaMinutos,
      esCompartido:     es_compartido !== undefined ? !!es_compartido : existente.esCompartido,
      esGlobal:         es_global    !== undefined ? !!es_global   : existente.esGlobal,
      proyectoId:       proyecto_id  !== undefined ? (proyecto_id ? parseInt(proyecto_id) : null) : existente.proyectoId,
    };

    let evento;
    try {
      // Intentar actualización completa (con recurrencia)
      evento = await prisma.evento.update({
        where: { id },
        data: {
          ...updateData,
          esRecurrente:     es_recurrente !== undefined ? !!es_recurrente : existente.esRecurrente,
          patronRecurrencia: es_recurrente && patron_recurrencia
            ? JSON.stringify(patron_recurrencia)
            : (es_recurrente === false ? null : existente.patronRecurrencia),
          fechaFinRecurr:   fecha_fin_recurrencia !== undefined
            ? (fecha_fin_recurrencia ? new Date(fecha_fin_recurrencia) : null)
            : existente.fechaFinRecurr,
        }
      });
    } catch (err) {
      console.warn('[agenda.editar] Falló actualización completa, reintentando básica...', err.message);
      // Fallback: actualización básica sin campos de recurrencia
      evento = await prisma.evento.update({
        where: { id },
        data: updateData
      });
    }

    return res.json({ evento });
  } catch (error) {
    console.error('[agenda.editar]', error);
    return res.status(500).json({ error: 'Error al editar el evento' });
  }
};

// ── Notificar a invitados (Interno) ──────────────────────────────────────────
async function crearNotificacionesInvitados(eventoId, creadorId, invitadosIds, tituloEvento, esGlobal = false) {
  try {
    if (!prisma) return;
    const cid = parseInt(creadorId);
    const creador = await prisma.usuario.findUnique({ where: { id: cid }, select: { nombre: true } });
    const nombreCreador = creador?.nombre || 'Un miembro';

    let ids = [];
    if (esGlobal) {
      const u = await prisma.usuario.findMany({ where: { id: { not: cid } }, select: { id: true } });
      ids = u.map(x => x.id);
    } else if (invitadosIds && invitadosIds.length > 0) {
      ids = invitadosIds.map(i => parseInt(i)).filter(i => i !== cid && !isNaN(i));
    }

    if (ids.length === 0) return;

    const data = ids.map(uid => ({
      usuarioId: uid,
      tipo: 'recordatorio',
      mensaje: `${nombreCreador} te ha invitado a: ${tituloEvento}`,
      leida: false
    }));

    await prisma.notificacion.createMany({ data });
    console.log(`[Notif] ${data.length} alertas enviadas.`);
  } catch (err) {
    console.error('[Notif] Error:', err.message);
  }
}

// ── POST /api/agenda ────────────────────────────────────────────────────────
const crear = async (req, res) => {
  const { 
    titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, color, 
    alerta_minutos, es_compartido, es_global, proyecto_id, invitados_ids,
    es_recurrente, patron_recurrencia, fecha_fin_recurrencia
  } = req.body;
  const usuarioId = req.usuario.id;

  if (!titulo || !tipo || !fecha_inicio) {
    return res.status(400).json({ error: 'Título, tipo y fecha de inicio son obligatorios' });
  }

  // Validar recurrencia: si es recurrente, el patrón es obligatorio
  if (es_recurrente && !patron_recurrencia) {
    return res.status(400).json({ error: 'Patrón de recurrencia requerido' });
  }

  try {
    let isTodoElDia = todo_el_dia === true;
    if (tipo === 'dia_completo') isTodoElDia = true;

    // Construir invitados
    const listadoInvitados = [];
    listadoInvitados.push({ usuarioId, estado: 'aceptado' });

    if (es_compartido) {
      const ids = new Set(invitados_ids || []);
      if (proyecto_id) {
        const proyecto = await prisma.proyecto.findUnique({
          where: { id: parseInt(proyecto_id) },
          include: { miembros: { select: { id: true } } }
        });
        if (proyecto) proyecto.miembros.forEach(m => ids.add(m.id));
      }
      ids.forEach(id => {
        if (id !== usuarioId) listadoInvitados.push({ usuarioId: id, estado: 'pendiente' });
      });
    }

    const createData = {
      usuarioId,
      creadoPorId:       usuarioId,
      titulo,
      descripcion,
      tipo,
      fechaInicio:       new Date(fecha_inicio),
      fechaFin:          fecha_fin ? new Date(fecha_fin) : null,
      todoElDia:         isTodoElDia,
      color:             color || '#4a90d9',
      alertaMinutos:     alerta_minutos ? parseInt(alerta_minutos) : null,
      esCompartido:      !!es_compartido,
      esGlobal:          !!es_global,
      proyectoId:        proyecto_id ? parseInt(proyecto_id) : null,
      invitados: { create: listadoInvitados }
    };

    let evento;
    try {
      // Intentar creación completa
      evento = await prisma.evento.create({
        data: {
          ...createData,
          esRecurrente:      !!es_recurrente,
          patronRecurrencia: es_recurrente ? JSON.stringify(patron_recurrencia) : null,
          fechaFinRecurr:    fecha_fin_recurrencia ? new Date(fecha_fin_recurrencia) : null,
        },
        include: { invitados: true }
      });
    } catch (err) {
      console.warn('[agenda.crear] Falló creación completa, reintentando básica...', err.message);
      // Fallback: creación básica
      evento = await prisma.evento.create({
        data: createData,
        include: { invitados: true }
      });
    }

    // Crear notificaciones de forma síncrona para asegurar el envío
    if (es_global || listadoInvitados.length > 1) {
      const idsFinales = listadoInvitados.map(i => i.usuarioId);
      await crearNotificacionesInvitados(evento.id, usuarioId, idsFinales, titulo, !!es_global);
    }

    return res.status(201).json({ evento });
  } catch (error) {
    console.error('[agenda.crear]', error);
    return res.status(500).json({ error: 'Error al crear el evento' });
  }
};


// ── PATCH /api/agenda/:id/responder ──────────────────────────────────────────
const responderInvitacion = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body; // 'aceptado', 'rechazado'
  const usuarioId = req.usuario.id;

  if (!['aceptado', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado de respuesta inválido' });
  }

  try {
    const invitacion = await prisma.eventoInvitado.findFirst({
      where: { eventoId: id, usuarioId }
    });

    if (!invitacion) {
      return res.status(404).json({ error: 'No tienes una invitación para este evento' });
    }

    await prisma.eventoInvitado.update({
      where: { id: invitacion.id },
      data: { estado, visto: true }
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('[agenda.responder]', error);
    return res.status(500).json({ error: 'Error al responder invitación' });
  }
};

// ── GET /api/agenda/invitaciones/pendientes ──────────────────────────────────
const invitacionesPendientes = async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    const pendientes = await prisma.eventoInvitado.findMany({
      where: { usuarioId, estado: 'pendiente' },
      include: {
        evento: {
          include: {
            creador: { select: { nombre: true } }
          }
        }
      }
    });
    return res.json({ pendientes });
  } catch (error) {
    console.error('[agenda.pendientes]', error);
    return res.status(500).json({ error: 'Error al obtener invitaciones' });
  }
};

// ── DELETE /api/agenda/:id ──────────────────────────────────────────────────
const eliminar = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;

  try {
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    if (evento.creadoPorId === usuarioId || evento.usuarioId === usuarioId) {
      // Es el creador -> Eliminar todo
      await prisma.evento.delete({ where: { id } });
      return res.json({ ok: true, mensaje: 'Evento eliminado para todos' });
    } else {
      // Es invitado -> Solo salir del evento
      const invitacion = await prisma.eventoInvitado.findFirst({
        where: { eventoId: id, usuarioId }
      });
      if (invitacion) {
        await prisma.eventoInvitado.delete({ where: { id: invitacion.id } });
        return res.json({ ok: true, mensaje: 'Has salido del evento' });
      }
      return res.status(403).json({ error: 'No tienes permiso para eliminar este evento' });
    }
  } catch (error) {
    console.error('[agenda.eliminar]', error);
    return res.status(500).json({ error: 'Error al eliminar el evento' });
  }
};

// ── GET /api/agenda/disponibilidad ───────────────────────────────────────────
const consultarDisponibilidad = async (req, res) => {
  const { usuarios_ids, inicio, fin } = req.query;
  if (!usuarios_ids || !inicio) return res.status(400).json({ error: 'Faltan parámetros' });

  try {
    const ids = usuarios_ids.split(',').map(id => parseInt(id));
    const start = new Date(inicio);
    const end = fin ? new Date(fin) : new Date(start.getTime() + 3600000);

    const conflictos = await prisma.evento.findMany({
      where: {
        OR: [
          { usuarioId: { in: ids } },
          { invitados: { some: { usuarioId: { in: ids }, estado: 'aceptado' } } }
        ],
        fechaInicio: { lt: end },
        fechaFin: { gt: start }
      },
      select: {
        id: true,
        titulo: true,
        fechaInicio: true,
        fechaFin: true,
        usuarioId: true
      }
    });

    return res.json({ conflictos });
  } catch (error) {
    console.error('[agenda.disponibilidad]', error);
    return res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
};

// ── CALENDARIO LABORAL ───────────────────────────────────────────────────────

const getConfigLaboral = async (req, res) => {
  const usuarioId = req.usuario.id;
  try {
    let config = await prisma.configuracionLaboral.findUnique({ where: { usuarioId } });
    if (!config) {
      // Valores por defecto
      config = {
        diasLaborales: [1, 2, 3, 4, 5],
        horaEntrada: '09:00',
        horaSalida: '18:00',
        horaComidaInicio: '14:00',
        horaComidaFin: '15:00'
      };
    }
    return res.json({ config });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

const updateConfigLaboral = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { 
    dias_laborales = [1,2,3,4,5], 
    hora_entrada = '09:00', 
    hora_salida = '18:00', 
    hora_comida_inicio = '14:00', 
    hora_comida_fin = '15:00' 
  } = req.body;

  try {
    const config = await prisma.configuracionLaboral.upsert({
      where: { usuarioId },
      update: {
        diasLaborales: dias_laborales,
        horaEntrada: hora_entrada,
        horaSalida: hora_salida,
        horaComidaInicio: hora_comida_inicio,
        horaComidaFin: hora_comida_fin
      },
      create: {
        usuarioId,
        diasLaborales: dias_laborales,
        horaEntrada: hora_entrada,
        horaSalida: hora_salida,
        horaComidaInicio: hora_comida_inicio,
        horaComidaFin: hora_comida_fin
      }
    });
    return res.json({ config });
  } catch (error) {
    console.error('[agenda.updateConfig]', error);
    return res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// ── DÍAS ESPECIALES ──────────────────────────────────────────────────────────

const listarDiasEspeciales = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { mes, anio } = req.query;

  try {
    const where = { usuarioId };
    if (mes && anio) {
      const start = new Date(parseInt(anio), parseInt(mes) - 1, 1);
      const end = new Date(parseInt(anio), parseInt(mes), 0);
      where.fecha = { gte: start, lte: end };
    }

    const dias = await prisma.diaEspecial.findMany({ where });
    return res.json({ dias });
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar días especiales' });
  }
};

const crearDiaEspecial = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { fecha, tipo, descripcion } = req.body;

  try {
    const dia = await prisma.diaEspecial.create({
      data: {
        usuarioId,
        fecha: new Date(fecha),
        tipo,
        descripcion
      }
    });
    return res.status(201).json({ dia });
  } catch (error) {
    console.error('[agenda.crearDia]', error);
    return res.status(500).json({ error: 'Error al crear día especial' });
  }
};

const eliminarDiaEspecial = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;

  try {
    const dia = await prisma.diaEspecial.findUnique({ where: { id } });
    if (!dia || dia.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    await prisma.diaEspecial.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar' });
  }
};

const recordatoriosProximos = async (req, res) => {
  const usuarioId = req.usuario.id;
  const ahora = new Date();
  const enUnaHora = new Date(ahora.getTime() + 60 * 60 * 1000);

  try {
    const recordatorios = await prisma.evento.findMany({
      where: {
        OR: [
          { usuarioId, tipo: 'recordatorio' },
          { invitados: { some: { usuarioId } }, tipo: 'recordatorio' }
        ],
        fechaInicio: { gte: ahora, lte: enUnaHora },
      },
      orderBy: { fechaInicio: 'asc' },
    });

    return res.json({ recordatorios });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar recordatorios' });
  }
};

module.exports = {
  listar,
  crear,
  editar,
  responderInvitacion,
  invitacionesPendientes,
  eliminar,
  consultarDisponibilidad,
  getConfigLaboral,
  updateConfigLaboral,
  listarDiasEspeciales,
  crearDiaEspecial,
  eliminarDiaEspecial,
  recordatoriosProximos,
};
