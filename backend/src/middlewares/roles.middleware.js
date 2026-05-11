// Middleware de roles
// Verifica que el usuario autenticado tenga el rol requerido

// Solo permite el paso a usuarios con rol ADMIN
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'ADMIN') {
    return res.status(403).json({
      error: 'Acceso denegado: solo los administradores pueden realizar esta acción',
    });
  }
  next();
};

module.exports = { soloAdmin };
