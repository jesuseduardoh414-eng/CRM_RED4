// Rutas de autenticación
// POST /api/auth/register → registrar usuario
// POST /api/auth/login    → iniciar sesión
// GET  /api/auth/me       → obtener usuario actual (protegida)

const express        = require('express');
const { register, login, me, forgotPassword, resetPassword, verifyAccount } = require('../controllers/auth.controller');
const { verificarToken }      = require('../middlewares/auth.middleware');
const { authLimiter }         = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Rutas públicas (protegidas con rate limit)
router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);
router.get('/verify/:token', verifyAccount);

// Ruta protegida (requiere token JWT válido)
router.get('/me', verificarToken, me);

module.exports = router;
