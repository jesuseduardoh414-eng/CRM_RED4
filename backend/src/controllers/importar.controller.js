/**
 * Controlador de Importación Masiva de Tareas
 * ────────────────────────────────────────────
 * POST /api/proyectos/:proyectoId/tareas/importar
 * GET  /api/tareas/plantilla/json
 * GET  /api/tareas/plantilla/excel
 */

const fs   = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { registrarActividad } = require('../utils/logger');
const {
  procesarJSON,
  procesarExcel,
  generarPlantillaJSON,
  generarPlantillaExcel,
} = require('../utils/importador.utils');

// ── POST /api/proyectos/:proyectoId/tareas/importar ─────────────────────────
const importar = async (req, res) => {
  // El routerProyecto se monta en /api/proyectos/:id/tareas,
  // por lo que el parámetro del proyecto se llama 'id'
  const proyectoId = parseInt(req.params.id);

  if (isNaN(proyectoId)) {
    return res.status(400).json({ error: 'ID de proyecto inválido' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo. Envía el archivo en el campo "archivo"' });
  }

  const filePath = req.file.path;

  try {
    // 1. Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { miembros: { select: { id: true, email: true, nombre: true } } },
    });

    if (!proyecto) {
      fs.unlinkSync(filePath);
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // 2. Verificar permisos: ADMIN puede siempre, MIEMBRO debe estar en el proyecto
    if (req.usuario.rol !== 'ADMIN') {
      const esMiembro = proyecto.miembros.some(m => m.id === req.usuario.id);
      if (!esMiembro) {
        fs.unlinkSync(filePath);
        return res.status(403).json({ error: 'No tienes permiso para importar tareas en este proyecto' });
      }
    }

    // 3. Determinar el asignado por defecto según el modo elegido en el frontend
    //    modoAsignacion: 'yo' | 'miembro' | 'archivo'
    const modoAsignacion = req.body.modoAsignacion || 'archivo';
    let asignadoPorDefecto = null;

    if (modoAsignacion === 'yo') {
      // Asignar al usuario que hace la subida
      asignadoPorDefecto = req.usuario.id;
    } else if (modoAsignacion === 'miembro') {
      const miembroId = parseInt(req.body.asignadoId);
      if (!isNaN(miembroId)) {
        // Validar que el miembro pertenezca al proyecto
        const esMiembro = proyecto.miembros.some(m => m.id === miembroId);
        if (!esMiembro && req.usuario.rol !== 'ADMIN') {
          fs.unlinkSync(filePath);
          return res.status(400).json({ error: 'El miembro seleccionado no pertenece a este proyecto' });
        }
        asignadoPorDefecto = miembroId;
      }
    }
    // modo 'archivo' → asignadoPorDefecto = null (respeta columna del archivo)

    // 4. Detectar tipo de archivo por extensión
    const ext = path.extname(req.file.originalname).toLowerCase();
    let resultado;

    if (ext === '.json') {
      resultado = await procesarJSON(filePath, proyectoId, proyecto.miembros, registrarActividad, req.usuario.id, asignadoPorDefecto);
    } else if (ext === '.xlsx' || ext === '.xls') {
      resultado = await procesarExcel(filePath, proyectoId, proyecto.miembros, registrarActividad, req.usuario.id, asignadoPorDefecto);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Tipo de archivo no soportado. Usa .json, .xlsx o .xls' });
    }

    // 4. Limpiar archivo temporal
    fs.unlinkSync(filePath);

    // 5. Respuesta
    return res.status(200).json({
      creadas: resultado.creadas,
      errores: resultado.errores,
    });

  } catch (error) {
    // Limpieza en caso de error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('[importar tareas]', error);
    return res.status(400).json({ error: error.message });
  }
};

// ── GET /api/tareas/plantilla/json ──────────────────────────────────────────
const plantillaJSON = (_req, res) => {
  const datos = generarPlantillaJSON();
  const json  = JSON.stringify(datos, null, 2);

  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_tareas.json"');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(json);
};

// ── GET /api/tareas/plantilla/excel ─────────────────────────────────────────
const plantillaExcel = (_req, res) => {
  const buffer = generarPlantillaExcel();

  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_tareas.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

module.exports = { importar, plantillaJSON, plantillaExcel };
