/**
 * Modal de Importación Masiva de Tareas
 * Soporta archivos Excel (.xlsx / .xls) y JSON.
 * Disponible para Admin y Miembros del proyecto.
 */

import { useState, useRef } from 'react';
import { tareasService } from '../services/api';

// ── Estilos inline de utilidades ─────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};

const card = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '1.25rem',
  padding: '2rem',
  width: '100%', maxWidth: '560px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

const FORMAT_INFO = {
  excel: {
    label: 'Excel',
    ext: '.xlsx,.xls',
    icono: '📊',
    columnas: [
      { campo: 'titulo',        desc: 'Obligatorio. Nombre de la tarea.' },
      { campo: 'descripcion',   desc: 'Opcional. Contexto adicional.' },
      { campo: 'estado',        desc: 'PENDIENTE | EN_PROGRESO | HECHO  (default: PENDIENTE)' },
      { campo: 'prioridad',     desc: 'BAJA | MEDIA | ALTA  (default: MEDIA)' },
      { campo: 'venceEn',       desc: 'Opcional. Fecha límite en formato YYYY-MM-DD' },
      { campo: 'asignadoEmail', desc: 'Opcional. Email de un miembro del proyecto' },
    ],
  },
  json: {
    label: 'JSON',
    ext: '.json',
    icono: '{ }',
    columnas: [
      { campo: 'titulo',        desc: 'Obligatorio. Texto de la tarea.' },
      { campo: 'descripcion',   desc: 'Opcional.' },
      { campo: 'estado',        desc: '"PENDIENTE" | "EN_PROGRESO" | "HECHO"' },
      { campo: 'prioridad',     desc: '"BAJA" | "MEDIA" | "ALTA"' },
      { campo: 'venceEn',       desc: 'Opcional. "YYYY-MM-DD"' },
      { campo: 'asignadoEmail', desc: 'Opcional. Email del miembro' },
    ],
  },
};

const ModalImportar = ({ proyectoId, onClose, onImportado }) => {
  const [tab, setTab]           = useState('excel');
  const [archivo, setArchivo]   = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null); // { creadas, errores }
  const [errorGlobal, setErrorGlobal] = useState('');
  const inputRef = useRef(null);

  const fmt = FORMAT_INFO[tab];

  const handleTabChange = (t) => {
    setTab(t);
    setArchivo(null);
    setResultado(null);
    setErrorGlobal('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    setArchivo(e.target.files[0] || null);
    setResultado(null);
    setErrorGlobal('');
  };

  const handleImportar = async () => {
    if (!archivo) { setErrorGlobal('Selecciona un archivo antes de importar.'); return; }
    setCargando(true);
    setErrorGlobal('');
    setResultado(null);

    try {
      const data = await tareasService.importar(proyectoId, archivo);
      setResultado(data);
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleCerrar = () => {
    if (resultado && resultado.creadas > 0) onImportado();
    onClose();
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div style={card}>

        {/* ── Cabecera ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.25rem' }}>
              📥 Importar tareas
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Crea múltiples tareas desde un archivo Excel o JSON.
            </p>
          </div>
          <button onClick={handleCerrar} style={{
            background: 'none', border: 'none', fontSize: '1.4rem',
            color: 'var(--color-text-muted)', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
          background: 'var(--color-surface-3)', borderRadius: '0.6rem',
          padding: '0.25rem', border: '1px solid var(--color-border)',
        }}>
          {['excel', 'json'].map(t => (
            <button key={t} onClick={() => handleTabChange(t)} style={{
              flex: 1, padding: '0.5rem 0.75rem',
              borderRadius: '0.4rem', border: 'none',
              cursor: 'pointer', fontWeight: tab === t ? '700' : '400',
              fontSize: '0.9rem', transition: 'all 0.15s',
              background: tab === t ? 'var(--color-primary)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--color-text-muted)',
            }}>
              {FORMAT_INFO[t].icono} {FORMAT_INFO[t].label}
            </button>
          ))}
        </div>

        {/* ── Descripción del formato ─────────────────────────────────────── */}
        <div style={{
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '0.6rem' }}>
            Formato de columnas esperado:
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.2rem 0.5rem', color: 'var(--color-text-muted)' }}>Campo</th>
                <th style={{ textAlign: 'left', padding: '0.2rem 0.5rem', color: 'var(--color-text-muted)' }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {fmt.columnas.map(col => (
                <tr key={col.campo}>
                  <td style={{ padding: '0.25rem 0.5rem', fontWeight: '600', color: '#a5b4fc', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {col.campo}
                  </td>
                  <td style={{ padding: '0.25rem 0.5rem', color: 'var(--color-text-muted)' }}>
                    {col.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Descarga de plantilla ───────────────────────────────────────── */}
        <button
          onClick={() => tareasService.descargarPlantilla(tab === 'excel' ? 'excel' : 'json')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            width: '100%', padding: '0.65rem 1rem', marginBottom: '1rem',
            background: 'transparent', border: '1px dashed var(--color-border)',
            borderRadius: '0.6rem', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          ⬇️ Descargar plantilla de ejemplo ({fmt.label})
        </button>

        {/* ── Input de archivo ────────────────────────────────────────────── */}
        {!resultado && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
              Seleccionar archivo {fmt.label}:
            </label>
            <div style={{
              border: `2px dashed ${archivo ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center',
              cursor: 'pointer', transition: 'border-color 0.15s',
              background: archivo ? 'rgba(99,102,241,0.05)' : 'transparent',
            }}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setArchivo(f); setResultado(null); setErrorGlobal(''); } }}
            >
              <input ref={inputRef} type="file" accept={fmt.ext} style={{ display: 'none' }} onChange={handleFileChange} />
              {archivo ? (
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>📄</div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{archivo.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {(archivo.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☁️</div>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>
                    Arrastra tu archivo aquí o <span style={{ color: 'var(--color-primary)' }}>haz clic</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {fmt.ext} · Máximo 5 MB
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Error global ────────────────────────────────────────────────── */}
        {errorGlobal && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '1rem',
            color: '#f87171', fontSize: '0.88rem',
          }}>
            ❌ {errorGlobal}
          </div>
        )}

        {/* ── Resultados ──────────────────────────────────────────────────── */}
        {resultado && (
          <div style={{ marginBottom: '1.25rem' }}>
            {/* Tareas creadas */}
            {resultado.creadas > 0 && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                color: '#34d399', fontSize: '0.95rem', fontWeight: '700',
              }}>
                ✅ {resultado.creadas} tarea{resultado.creadas !== 1 ? 's' : ''} creada{resultado.creadas !== 1 ? 's' : ''} correctamente
              </div>
            )}

            {/* Ninguna tarea creada */}
            {resultado.creadas === 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                color: '#f87171', fontSize: '0.9rem', fontWeight: '700',
              }}>
                ⚠️ No se pudo importar ninguna tarea. Corrige los errores y vuelve a intentarlo.
              </div>
            )}

            {/* Lista de errores */}
            {resultado.errores && resultado.errores.length > 0 && (
              <div style={{
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '0.6rem', padding: '0.75rem 1rem',
              }}>
                <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fbbf24', marginBottom: '0.5rem' }}>
                  ⚠️ {resultado.errores.length} error{resultado.errores.length !== 1 ? 'es' : ''} encontrado{resultado.errores.length !== 1 ? 's' : ''}:
                </p>
                <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                  {resultado.errores.map((e, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                      <strong style={{ color: '#fbbf24' }}>Fila {e.fila}:</strong> {e.razon}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Acciones ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={handleCerrar} style={{
            flex: 1, padding: '0.75rem',
            background: 'transparent', border: '1px solid var(--color-border)',
            borderRadius: '0.75rem', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
          }}>
            Cerrar
          </button>

          {!resultado && (
            <button
              onClick={handleImportar}
              disabled={cargando || !archivo}
              className="btn-primary"
              style={{
                flex: 1.5, padding: '0.75rem', fontSize: '0.9rem',
                opacity: !archivo ? 0.5 : 1,
              }}
            >
              {cargando ? '⏳ Procesando archivo...' : '📥 Importar'}
            </button>
          )}

          {resultado && resultado.creadas === 0 && (
            <button
              onClick={() => { setResultado(null); setArchivo(null); setErrorGlobal(''); if (inputRef.current) inputRef.current.value = ''; }}
              className="btn-primary"
              style={{ flex: 1.5, padding: '0.75rem', fontSize: '0.9rem' }}
            >
              🔄 Reintentar
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ModalImportar;
