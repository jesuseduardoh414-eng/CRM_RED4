// Limites de dia en hora de Mexico.
//
// El servidor corre en UTC (Vercel no define TZ), asi que `setHours(0,0,0,0)`
// marcaba el inicio del dia *UTC*: las 00:00 UTC son las 18:00 del dia anterior
// en Mexico. Una tarea cerrada a las 7 de la noche contaba como del dia
// siguiente. Estas funciones fijan el corte donde de verdad cambia el dia.

const OFFSET_MEXICO_MS = 6 * 60 * 60 * 1000; // UTC-6

/** Partes de la fecha civil mexicana correspondiente a un instante dado. */
const partesDiaMexico = (instante = new Date()) => {
  const mx = new Date(new Date(instante).getTime() - OFFSET_MEXICO_MS);
  return { year: mx.getUTCFullYear(), month: mx.getUTCMonth(), day: mx.getUTCDate() };
};

/**
 * Rango [inicio, fin] en UTC que cubre un dia natural mexicano.
 * `fecha` puede ser 'YYYY-MM-DD'; si no viene, se usa el dia de hoy en Mexico.
 */
const rangoDiaMexico = (fecha) => {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))
    ? new Date(`${fecha}T12:00:00.000Z`) // mediodia UTC: mismo dia civil en Mexico
    : new Date();

  const { year, month, day } = partesDiaMexico(base);

  return {
    // 00:00 Mexico = 06:00 UTC del mismo dia
    inicio: new Date(Date.UTC(year, month, day, 6, 0, 0, 0)),
    // 23:59:59 Mexico = 05:59:59 UTC del dia siguiente (Date.UTC desborda solo)
    fin: new Date(Date.UTC(year, month, day, 29, 59, 59, 999)),
  };
};

/** 'YYYY-MM-DD' del dia mexicano de un instante. */
const claveDiaMexico = (instante = new Date()) => {
  const { year, month, day } = partesDiaMexico(instante);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

module.exports = { OFFSET_MEXICO_MS, partesDiaMexico, rangoDiaMexico, claveDiaMexico };
