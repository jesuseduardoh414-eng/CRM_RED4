const express = require('express');
const { getAdminStats } = require('../controllers/stats.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin } = require('../middlewares/roles.middleware');

const router = express.Router();

// Ruta protegida solo para administradores
router.get('/admin', verificarToken, soloAdmin, getAdminStats);

module.exports = router;
