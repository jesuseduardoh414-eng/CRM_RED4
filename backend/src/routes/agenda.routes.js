// Rutas de la Agenda Personal
const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agenda.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas de agenda requieren autenticación
router.use(verificarToken);

// Configuración laboral (Debe ir antes de /:id para evitar conflictos)
router.get('/config-laboral', agendaController.getConfigLaboral);
router.put('/config-laboral', agendaController.updateConfigLaboral);

// Endpoints principales
router.get('/',               agendaController.listar);
router.post('/',              agendaController.crear);
router.get('/recordatorios', agendaController.recordatoriosProximos);
router.get('/invitaciones/pendientes', agendaController.invitacionesPendientes);
router.patch('/:id/responder', agendaController.responderInvitacion);
router.get('/disponibilidad', agendaController.consultarDisponibilidad);
router.put('/:id',            agendaController.editar);
router.delete('/:id',         agendaController.eliminar);

// Días especiales
router.get('/dias-especiales', agendaController.listarDiasEspeciales);
router.post('/dias-especiales', agendaController.crearDiaEspecial);
router.delete('/dias-especiales/:id', agendaController.eliminarDiaEspecial);

module.exports = router;
