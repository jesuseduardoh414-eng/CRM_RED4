const prisma = require('../lib/prisma');

const listar = async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { creadaEn: 'desc' },
      take: 20
    });
    res.json({ notificaciones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notificacion.updateMany({
      where: { id: Number(id), usuarioId: req.usuario.id },
      data: { leida: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const marcarTodasLeidas = async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { usuarioId: req.usuario.id, leida: false },
      data: { leida: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notificacion.deleteMany({
      where: { id: Number(id), usuarioId: req.usuario.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listar,
  marcarLeida,
  marcarTodasLeidas,
  eliminar
};
