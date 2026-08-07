// Catalogo unico de estados de proyecto para el frontend.
//
// Antes esta lista estaba duplicada en ProyectosPage, DashboardPage y EquipoPage,
// cada una con sus propios colores. El backend tiene su equivalente en
// backend/src/utils/estados.utils.js — si cambias uno, cambia el otro.

export const ESTADO_PROYECTO_DEFAULT = 'ACTIVO';

export const ESTADOS_PROYECTO = [
  { value: 'ACTIVO',    labelKey: 'statusActive',   color: '#00d166', bg: 'rgba(0,209,102,0.12)' },
  { value: 'INACTIVO',  labelKey: 'statusInactive', color: '#ff9100', bg: 'rgba(255,145,0,0.12)' },
  { value: 'TERMINADO', labelKey: 'statusFinished', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  { value: 'ARCHIVADO', labelKey: 'statusArchived', color: '#6c757d', bg: 'rgba(108,117,125,0.12)' },
];

// Nombres antiguos que pueden seguir vivos en la base
const ALIAS = {
  EN_PAUSA: 'INACTIVO',
  PAUSA: 'INACTIVO',
  PAUSADO: 'INACTIVO',
  PENDIENTE: 'INACTIVO',
  CERRADO: 'TERMINADO',
  FINALIZADO: 'TERMINADO',
  HECHO: 'TERMINADO',
};

export const normalizarEstadoProyecto = (estado) => {
  const bruto = String(estado || '').trim().toUpperCase();
  if (!bruto) return ESTADO_PROYECTO_DEFAULT;
  const normalizado = ALIAS[bruto] || bruto;
  return ESTADOS_PROYECTO.some((e) => e.value === normalizado)
    ? normalizado
    : ESTADO_PROYECTO_DEFAULT;
};

export const getEstadoProyecto = (estado) => (
  ESTADOS_PROYECTO.find((e) => e.value === normalizarEstadoProyecto(estado)) || ESTADOS_PROYECTO[0]
);

/**
 * Un proyecto esta "listo para revision" cuando todas sus tareas estan hechas
 * pero el admin todavia no ha dado el visto bueno. No se marca solo a proposito:
 * el 100% es una sugerencia, la decision es del admin.
 */
export const estaListoParaRevision = (proyecto) => {
  const total = proyecto?._count?.tareas ?? 0;
  const progreso = proyecto?.progresoGeneral ?? proyecto?.progreso ?? 0;
  return total > 0
    && progreso >= 100
    && normalizarEstadoProyecto(proyecto?.estado) === 'ACTIVO';
};
