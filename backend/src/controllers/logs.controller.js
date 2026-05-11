const prisma = require('../lib/prisma');

const listarPorProyecto = async (req, res) => {
  const proyectoId = parseInt(req.params.id);
  if (isNaN(proyectoId)) return res.status(400).json({ error: 'ID de proyecto inválido' });

  try {
    const logs = await prisma.logActividad.findMany({
      where: { proyectoId },
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
