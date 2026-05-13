// Punto de entrada del servidor Express
const express = require('express');
const cors    = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes                        = require('./routes/auth.routes');
const proyectosRoutes                   = require('./routes/proyectos.routes');
const { routerProyecto, routerTarea }   = require('./routes/tareas.routes');
const usuariosRoutes                    = require('./routes/usuarios.routes');
const notificacionesRoutes              = require('./routes/notificaciones.routes');
const statsRoutes                       = require('./routes/stats.routes');
const agendaRoutes                      = require('./routes/agenda.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// Confiar en el proxy de Render para que express-rate-limit funcione bien
app.set('trust proxy', 1);

// ── Middlewares globales ────────────────────────────────────────────────────
app.use(helmet()); // Seguridad de headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // URL del frontend en desarrollo o producción
  credentials: true,
}));
app.use(express.json()); // Parsear cuerpo JSON de las peticiones

// ── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth',                        authRoutes);
app.use('/api/proyectos',                   proyectosRoutes);
app.use('/api/proyectos/:id/tareas',        routerProyecto); // GET y POST de tareas
app.use('/api/tareas',                      routerTarea);    // PUT, DELETE, PATCH de tareas
app.use('/api/usuarios',                    usuariosRoutes);
app.use('/api/notificaciones',              notificacionesRoutes);
app.use('/api/stats',                       statsRoutes);
app.use('/api/agenda',                      agendaRoutes);

// Ruta de salud para verificar que el servidor está corriendo
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mensaje: 'Servidor CRM funcionando' });
});

// ── Inicio del servidor ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
