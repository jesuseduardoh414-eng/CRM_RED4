// Rutas de Usuarios — Gestión Administrativa
const express = require('express');
const { listar, crear, editar, eliminar, toggleEstado } = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin }      = require('../middlewares/roles.middleware');

const router = express.Router();

// Todas las rutas de usuarios requieren estar logueado
router.use(verificarToken);

// Listar usuarios
router.get('/', listar);

// Operaciones de gestión (solo para administradores)
router.post('/',           soloAdmin, crear);
router.put('/:id',         soloAdmin, editar);
router.put('/:id/estado',  soloAdmin, toggleEstado);
router.delete('/:id',      soloAdmin, eliminar);

module.exports = router;
