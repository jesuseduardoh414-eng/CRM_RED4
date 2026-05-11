const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// Devuelve todos los usuarios sin exponer sus contraseñas
const listar = async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id:     true,
        nombre: true,
        email:  true,
        area:   true,
        rol:    true,
        creadoEn: true
      },
    });
    return res.json({ usuarios });
  } catch (error) {
    console.error('[usuarios.listar]', error);
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
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: 'El correo ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { sendVerificationEmail } = require('../services/email.service');
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
        verificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
      },
      select: { id: true, nombre: true, email: true, area: true, rol: true }
    });

    // Enviar email de verificación al nuevo usuario
    await sendVerificationEmail(email.toLowerCase().trim(), verificationToken);

    return res.status(201).json({ mensaje: 'Usuario creado exitosamente', usuario });
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

    return res.json({ mensaje: 'Usuario eliminado correctamente y sus dependencias han sido gestionadas' });
  } catch (error) {
    console.error('[usuarios.eliminar]', error);
    return res.status(500).json({ error: 'Error al eliminar usuario. Puede tener dependencias complejas.' });
  }
};

module.exports = { listar, crear, editar, eliminar };
