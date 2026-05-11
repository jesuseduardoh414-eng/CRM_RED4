// Rutas de Usuarios — Gestión Administrativa
const express = require('express');
const { listar, crear, editar, eliminar } = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin }      = require('../middlewares/roles.middleware');

const router = express.Router();

// Todas las rutas de usuarios requieren estar logueado
router.use(verificarToken);

// Listar usuarios (generalmente para dropdowns, pero el admin ve todo)
router.get('/', listar);

// Operaciones de gestión (solo para administradores)
router.post('/',           soloAdmin, crear);
router.put('/:id',         soloAdmin, editar);
router.delete('/:id',      soloAdmin, eliminar);

module.exports = router;
