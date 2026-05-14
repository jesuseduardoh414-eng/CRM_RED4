const prisma = require('../lib/prisma');
const { registrarActividad } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const listar = async (req, res) => {
  const { id: parentId } = req.params;
  const isTarea = req.baseUrl.includes('tareas');
  
  try {
    const adjuntos = await prisma.adjunto.findMany({
      where: isTarea ? { tareaId: Number(parentId) } : { proyectoId: Number(parentId) },
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: { select: { id: true, nombre: true } }
      }
    });
    res.json({ adjuntos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const subir = async (req, res) => {
  const { id: parentId } = req.params;
  const isTarea = req.baseUrl.includes('tareas');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  try {
    let proyectoId = null;
    let tituloRef = '';

    if (isTarea) {
      const tarea = await prisma.tarea.findUnique({ where: { id: Number(parentId) } });
      if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
      proyectoId = tarea.proyectoId;
      tituloRef = `la tarea "${tarea.titulo}"`;

      // Si es MIEMBRO, verificar que pertenece a la lista de miembros del proyecto
      if (req.usuario.rol !== 'ADMIN') {
        const miembro = await prisma.proyecto.findFirst({
          where: { id: proyectoId, miembros: { some: { id: req.usuario.id } } }
        });
        if (!miembro) return res.status(403).json({ error: 'No tienes permiso para subir archivos a este proyecto' });
      }
    } else {
      const proyecto = await prisma.proyecto.findUnique({ where: { id: Number(parentId) } });
      if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
      proyectoId = proyecto.id;
      tituloRef = `el proyecto "${proyecto.nombre}"`;

      // Si es MIEMBRO, verificar que pertenece a la lista de miembros del proyecto
      if (req.usuario.rol !== 'ADMIN') {
        const miembro = await prisma.proyecto.findFirst({
          where: { id: proyectoId, miembros: { some: { id: req.usuario.id } } }
        });
        if (!miembro) return res.status(403).json({ error: 'No tienes permiso para subir archivos a este proyecto' });
      }
    }

    const adjunto = await prisma.adjunto.create({
      data: {
        nombre: req.file.originalname,
        url: req.file.filename,
        tipo: req.file.mimetype,
        tamano: req.file.size,
        tareaId: isTarea ? Number(parentId) : null,
        proyectoId: !isTarea ? Number(parentId) : null,
        usuarioId: req.usuario.id
      },
      include: {
        usuario: { select: { id: true, nombre: true } }
      }
    });

    // Registrar actividad
    await registrarActividad(
      req.usuario.id,
      proyectoId,
      'SUBIR_ARCHIVO',
      `${req.usuario.nombre} subió el archivo "${adjunto.nombre}" a ${tituloRef}`,
      isTarea ? Number(parentId) : null
    );

    res.status(201).json({ adjunto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    const adjunto = await prisma.adjunto.findUnique({ 
      where: { id: Number(id) },
      include: { tarea: true }
    });

    if (!adjunto) return res.status(404).json({ error: 'Archivo no encontrado' });

    // Solo el autor o un ADMIN pueden borrarlo
    if (adjunto.usuarioId !== req.usuario.id && req.usuario.rol !== 'ADMIN') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo' });
    }

    // Borrar archivo físico
    const filePath = path.join(__dirname, '../../uploads', adjunto.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.adjunto.delete({ where: { id: Number(id) } });

    // Registrar actividad
    let proyectoId = adjunto.proyectoId;
    let desc = `archivo "${adjunto.nombre}"`;

    if (adjunto.tarea) {
      proyectoId = adjunto.tarea.proyectoId;
      desc += ` de la tarea "${adjunto.tarea.titulo}"`;
    } else if (adjunto.proyectoId) {
      const proyecto = await prisma.proyecto.findUnique({ where: { id: adjunto.proyectoId } });
      if (proyecto) desc += ` del proyecto "${proyecto.nombre}"`;
    }

    await registrarActividad(
      req.usuario.id,
      proyectoId,
      'ELIMINAR_ARCHIVO',
      `${req.usuario.nombre} eliminó el ${desc}`,
      adjunto.tareaId || null
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const descargar = async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Archivo no encontrado físicamente' });
  }
};

module.exports = {
  listar,
  subir,
  eliminar,
  descargar
};
