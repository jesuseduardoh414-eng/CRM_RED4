// Rutas de Tareas con control de roles
// DELETE y operaciones destructivas requieren rol ADMIN

const express = require('express');
const { listar, crear, editar, eliminar, actualizarEstado } = require('../controllers/tareas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin }      = require('../middlewares/roles.middleware');
const { listar: listarComentarios, crear: crearComentario, eliminar: eliminarComentario } = require('../controllers/comentarios.controller');
const { listar: listarAdjuntos, subir: subirAdjunto, eliminar: eliminarAdjunto, descargar: descargarAdjunto } = require('../controllers/adjuntos.controller');
const upload = require('../middlewares/upload.middleware');

const routerProyecto = express.Router({ mergeParams: true });
const routerTarea    = express.Router();

routerProyecto.use(verificarToken);
routerTarea.use(verificarToken);

// Listar y crear tareas (cualquier usuario autenticado)
routerProyecto.get('/',  listar);
routerProyecto.post('/', upload.array('archivos', 5), crear); // Máximo 5 archivos al crear

// Editar y cambiar estado (cualquier usuario autenticado)
routerTarea.put('/:id',          editar);
routerTarea.patch('/:id/estado', actualizarEstado);

// Eliminar tarea (solo ADMIN)
routerTarea.delete('/:id', soloAdmin, eliminar);

// Comentarios de una tarea
routerTarea.get('/:id/comentarios', listarComentarios);
routerTarea.post('/:id/comentarios', crearComentario);
routerTarea.delete('/comentarios/:id', eliminarComentario);

// Adjuntos de una tarea
routerTarea.get('/:id/adjuntos',         listarAdjuntos);
routerTarea.post('/:id/adjuntos',        upload.single('archivo'), subirAdjunto);
routerTarea.delete('/adjuntos/:id',      eliminarAdjunto);
routerTarea.get('/adjuntos/descargar/:filename', descargarAdjunto);

module.exports = { routerProyecto, routerTarea };
