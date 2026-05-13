const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../lib/prisma');
const crypto  = require('crypto');
const { validarPassword } = require('../utils/security.utils');
const { sendResetEmail, sendVerificationEmail } = require('../services/email.service');
const { enviarInvitacion } = require('../services/correo');

// POST /api/auth/register - DESHABILITADO (Solo por invitaciÃ³n)
const register = async (req, res) => {
  return res.status(403).json({ error: 'El registro pÃºblico estÃ¡ deshabilitado. Solicita una invitaciÃ³n al administrador.' });
};

// €€ GET /api/auth/verify/:token €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const verifyAccount = async (req, res) => {
  const { token } = req.params;

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { verificationToken: token }
    });

    if (!usuario) {
      // Verificar si ya estÃ¡ verificado (el token ya se borrÃ³)
      // En este caso, el token no existe, pero podrÃ­amos intentar buscar por algo mÃ¡s? 
      // No, si el token no existe es invÃ¡lido. Pero si el usuario ya estÃ¡ verificado,
      // el frontend podrÃ­a haber mostrado el error antes.
      return res.status(400).json({ error: 'Token de verificaciÃ³n invÃ¡lido o ya utilizado' });
    }

    // Verificar expiraciÃ³n
    if (usuario.verificationTokenExpires && usuario.verificationTokenExpires < new Date()) {
      return res.status(400).json({ error: 'El enlace de verificaciÃ³n ha expirado (duraciÃ³n: 15 min)' });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        verificado: true,
        verificationToken: null
      }
    });

    return res.json({ mensaje: 'Cuenta verificada correctamente. Ya puedes iniciar sesiÃ³n.' });
  } catch (error) {
    console.error('[verifyAccount]', error);
    return res.status(500).json({ error: 'Error al verificar cuenta' });
  }
};

// €€ POST /api/auth/login €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseÃ±a son requeridos' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales invÃ¡lidas' });
    }

    // VERIFICAR SI ESTÃ ACTIVO
    if (usuario.estado && usuario.estado !== 'activo') {
      return res.status(403).json({ error: 'Tu cuenta no estÃ¡ activa, contacta al administrador' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales invÃ¡lidas' });
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

// €€ POST /api/auth/forgot-password €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email es requerido' });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    
    if (!usuario) {
      return res.json({ mensaje: 'Si el correo estÃ¡ registrado, recibirÃ¡s un enlace de recuperaciÃ³n' });
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

    return res.json({ mensaje: 'Si el correo estÃ¡ registrado, recibirÃ¡s un enlace de recuperaciÃ³n' });
  } catch (error) {
    console.error('[forgotPassword Error]:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message,
      code: error.code
    });
  }
};

// €€ POST /api/auth/reset-password/:token €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Nueva contraseÃ±a es requerida' });

  const validation = validarPassword(password);
  if (!validation.valido) {
    return res.status(400).json({ error: 'ContraseÃ±a no segura', detalles: validation.errores });
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
      return res.status(400).json({ error: 'Token invÃ¡lido o expirado' });
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

    return res.json({ mensaje: 'ContraseÃ±a actualizada correctamente' });
  } catch (error) {
    console.error('[resetPassword]', error);
    return res.status(500).json({ error: 'Error al resetear contraseÃ±a' });
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

// €€ INVITACIONES €€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€

const invitar = async (req, res) => {
  const { nombre, email, area, rol } = req.body;

  if (!nombre || !email || !area || !rol) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (usuarioExistente) {
      return res.status(409).json({ error: 'El email ya estÃ¡ registrado' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

    await prisma.invitacion.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        area,
        rol: rol.toLowerCase(),
        token,
        expiraEn,
        creadoPor: req.usuario.id
      }
    });

    await enviarInvitacion({ nombre, email, token });

    return res.json({ mensaje: `InvitaciÃ³n enviada a ${email}` });
  } catch (error) {
    console.error('[invitar]', error);
    return res.status(500).json({ error: 'Error al enviar invitaciÃ³n' });
  }
};

const verificarInvitacion = async (req, res) => {
  const { token } = req.params;

  try {
    const invitacion = await prisma.invitacion.findUnique({ where: { token } });

    if (!invitacion) {
      return res.status(404).json({ error: 'InvitaciÃ³n no vÃ¡lida' });
    }

    if (invitacion.estado === 'aceptada') {
      return res.status(409).json({ error: 'InvitaciÃ³n ya utilizada' });
    }

    if (invitacion.expiraEn < new Date() || invitacion.estado === 'expirada') {
      return res.status(410).json({ error: 'InvitaciÃ³n expirada' });
    }

    return res.json({
      nombre: invitacion.nombre,
      email: invitacion.email,
      area: invitacion.area
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al verificar invitaciÃ³n' });
  }
};

const aceptarInvitacion = async (req, res) => {
  const { token } = req.params;
  const { password, confirmar_password } = req.body;

  if (!password || !confirmar_password) {
    return res.status(400).json({ error: 'La contraseÃ±a es requerida' });
  }

  if (password !== confirmar_password) {
    return res.status(400).json({ error: 'Las contraseÃ±as no coinciden' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseÃ±a debe tener al menos 8 caracteres' });
  }

  try {
    const invitacion = await prisma.invitacion.findUnique({ where: { token } });

    if (!invitacion || invitacion.estado !== 'pendiente' || invitacion.expiraEn < new Date()) {
      return res.status(400).json({ error: 'InvitaciÃ³n invÃ¡lida o expirada' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Crear el usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: invitacion.nombre,
        email: invitacion.email,
        password: passwordHash,
        area: invitacion.area,
        rol: invitacion.rol.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'MIEMBRO',
        estado: 'activo',
        verificado: true
      }
    });

    // Marcar invitaciÃ³n como aceptada
    await prisma.invitacion.update({
      where: { id: invitacion.id },
      data: { estado: 'aceptada' }
    });

    // Generar JWT
    const jwtToken = jwt.sign(
      { id: nuevoUsuario.id, email: nuevoUsuario.email, nombre: nuevoUsuario.nombre, area: nuevoUsuario.area, rol: nuevoUsuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      mensaje: 'Cuenta activada correctamente',
      token: jwtToken,
      usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, email: nuevoUsuario.email, area: nuevoUsuario.area, rol: nuevoUsuario.rol }
    });
  } catch (error) {
    console.error('[aceptarInvitacion]', error);
    return res.status(500).json({ error: 'Error al aceptar invitaciÃ³n' });
  }
};

const reenviarInvitacion = async (req, res) => {
  const { email } = req.body;

  try {
    const invitacion = await prisma.invitacion.findFirst({
      where: { email: email.toLowerCase().trim(), estado: { not: 'aceptada' } }
    });

    if (!invitacion) {
      return res.status(404).json({ error: 'No se encontrÃ³ una invitaciÃ³n pendiente para este email' });
    }

    const nuevoToken = crypto.randomBytes(32).toString('hex');
    const nuevaExpiracion = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.invitacion.update({
      where: { id: invitacion.id },
      data: {
        token: nuevoToken,
        expiraEn: nuevaExpiracion,
        estado: 'pendiente'
      }
    });

    await enviarInvitacion({ nombre: invitacion.nombre, email: invitacion.email, token: nuevoToken });

    return res.json({ mensaje: 'InvitaciÃ³n reenviada correctamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al reenviar invitaciÃ³n' });
  }
};

const listarInvitaciones = async (req, res) => {
  try {
    const invitaciones = await prisma.invitacion.findMany({
      orderBy: { creadoEn: 'desc' },
      include: { creador: { select: { nombre: true } } }
    });
    return res.json(invitaciones);
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar invitaciones' });
  }
};

module.exports = { 
  register, 
  login, 
  me, 
  forgotPassword, 
  resetPassword, 
  verifyAccount,
  invitar,
  verificarInvitacion,
  aceptarInvitacion,
  reenviarInvitacion,
  listarInvitaciones
};
