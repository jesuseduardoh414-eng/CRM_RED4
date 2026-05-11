const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../lib/prisma');
const crypto  = require('crypto');
const { validarPassword } = require('../utils/security.utils');
const { sendResetEmail, sendVerificationEmail } = require('../services/email.service');

// ── POST /api/auth/register ─────────────────────────────────────────────────
const register = async (req, res) => {
  const { nombre, email, password, area } = req.body;

  if (!nombre || !email || !password || !area) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const validation = validarPassword(password);
  if (!validation.valido) {
    return res.status(400).json({ 
      error: 'La contraseña no cumple los requisitos de seguridad',
      detalles: validation.errores 
    });
  }

  try {
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (usuarioExistente) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        password: passwordHash,
        area,
        rol: 'MIEMBRO',
        verificado: false,
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
      }
    });

    // Enviar email de verificación
    await sendVerificationEmail(email.toLowerCase().trim(), verificationToken);

    return res.status(201).json({
      mensaje: 'Registro exitoso. Por favor revisa tu correo para verificar tu cuenta.',
    });
  } catch (error) {
    console.error('[register]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── GET /api/auth/verify/:token ─────────────────────────────────────────────
const verifyAccount = async (req, res) => {
  const { token } = req.params;

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { verificationToken: token }
    });

    if (!usuario) {
      // Verificar si ya está verificado (el token ya se borró)
      // En este caso, el token no existe, pero podríamos intentar buscar por algo más? 
      // No, si el token no existe es inválido. Pero si el usuario ya está verificado,
      // el frontend podría haber mostrado el error antes.
      return res.status(400).json({ error: 'Token de verificación inválido o ya utilizado' });
    }

    // Verificar expiración
    if (usuario.verificationTokenExpires && usuario.verificationTokenExpires < new Date()) {
      return res.status(400).json({ error: 'El enlace de verificación ha expirado (duración: 15 min)' });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        verificado: true,
        verificationToken: null
      }
    });

    return res.json({ mensaje: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[verifyAccount]', error);
    return res.status(500).json({ error: 'Error al verificar cuenta' });
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // VERIFICAR SI ESTÁ VERIFICADO (Solo para MIEMBROS)
    if (usuario.rol !== 'ADMIN' && !usuario.verificado) {
      return res.status(403).json({ error: 'Debes verificar tu cuenta por correo antes de iniciar sesión' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre, area: usuario.area, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, area: usuario.area, rol: usuario.rol },
    });
  } catch (error) {
    console.error('[login]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email es requerido' });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    if (!usuario) {
      return res.json({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpires: new Date(Date.now() + 3600000)
      }
    });

    await sendResetEmail(usuario.email, token);

    return res.json({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
  } catch (error) {
    console.error('[forgotPassword]', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /api/auth/reset-password/:token ────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Nueva contraseña es requerida' });

  const validation = validarPassword(password);
  if (!validation.valido) {
    return res.status(400).json({ error: 'Contraseña no segura', detalles: validation.errores });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const usuario = await prisma.usuario.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpires: { gt: new Date() }
      }
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    return res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('[resetPassword]', error);
    return res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

const me = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { id: true, nombre: true, email: true, area: true, rol: true, creadoEn: true },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ usuario });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { register, login, me, forgotPassword, resetPassword, verifyAccount };
