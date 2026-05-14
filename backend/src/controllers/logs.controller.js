const prisma = require('../lib/prisma');

const listarPorProyecto = async (req, res) => {
  const proyectoId = parseInt(req.params.id);
  if (isNaN(proyectoId)) return res.status(400).json({ error: 'ID de proyecto inválido' });

  try {
    const esAdmin = req.usuario.rol === 'ADMIN';
    const accionesSoloDeTarea = [
      'CREAR_TAREA',
      'EDITAR_TAREA',
      'ELIMINAR_TAREA',
      'CAMBIO_ESTADO'
    ];

    const logs = await prisma.logActividad.findMany({
      where: {
        proyectoId,
        ...(esAdmin ? {} : {
          OR: [
            {
              tareaId: null,
              accion: { notIn: accionesSoloDeTarea },
              NOT: { descripcion: { contains: 'tarea' } }
            },
            { tarea: { asignadoId: null } },
            { tarea: { asignadoId: req.usuario.id } },
            { tarea: { creadorId: req.usuario.id } }
          ]
        })
      },
      orderBy: { creadoEn: 'desc' },
      take: 50, // Limitamos a los últimos 50 para rendimiento
      include: {
        usuario: {
          select: { id: true, nombre: true, area: true }
        }
      }
    });

    res.json({ logs });
  } catch (error) {
    console.error('[logs.listarPorProyecto]', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};

module.exports = {
  listarPorProyecto
};
