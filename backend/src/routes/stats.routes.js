const express = require('express');
const { getAdminStats, getMemberStats, getActividadEquipoPorDia } = require('../controllers/stats.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin, soloMiembro } = require('../middlewares/roles.middleware');

const router = express.Router();

// Ruta protegida solo para administradores
router.get('/admin', verificarToken, soloAdmin, getAdminStats);
router.get('/member', verificarToken, soloMiembro, getMemberStats);

// Actividad del equipo de un dia concreto (?fecha=YYYY-MM-DD)
router.get('/actividad-equipo', verificarToken, soloAdmin, getActividadEquipoPorDia);

module.exports = router;
