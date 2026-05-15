/**
 * Modal de Importación Masiva de Tareas
 * Soporta archivos Excel (.xlsx / .xls) y JSON.
 * Props:
 *   proyectoId   - ID del proyecto
 *   usuarios     - lista de miembros del proyecto [{ id, nombre, email }]
 *   usuarioActual - usuario autenticado { id, nombre, rol }
 *   onClose      - callback al cerrar
 *   onImportado  - callback cuando se importaron tareas con éxito
 */

import { useState, useRef } from 'react';
import { tareasService } from '../services/api';
import { 
  FileSpreadsheet, 
  Braces, 
  User, 
  Users, 
  FileText, 
  Download, 
  UploadCloud, 
  File, 
  X, 
  CheckCircle2, 
  XCircle, 
  Info, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

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
  width: '100%', maxWidth: '580px',
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

const FORMAT_INFO = {
  excel: {
    label: 'Excel',
    ext: '.xlsx,.xls',
    icono: <FileSpreadsheet size={16} />,
    columnas: [
      { campo: 'titulo',        desc: 'Obligatorio. Nombre de la tarea.' },
      { campo: 'descripcion',   desc: 'Opcional. Contexto adicional.' },
      { campo: 'estado',        desc: 'PENDIENTE | EN_PROGRESO | HECHO  (default: PENDIENTE)' },
      { campo: 'prioridad',     desc: 'BAJA | MEDIA | ALTA  (default: MEDIA)' },
      { campo: 'fechaInicio',   desc: 'Opcional. Fecha de comienzo (YYYY-MM-DD)' },
      { campo: 'venceEn',       desc: 'Opcional. Fecha límite (YYYY-MM-DD)' },
      { campo: 'asignadoEmail', desc: 'Opcional. Solo se usa si eliges "Según el archivo"' },
    ],
  },
  json: {
    label: 'JSON',
    ext: '.json',
    icono: <Braces size={16} />,
    columnas: [
      { campo: 'titulo',        desc: 'Obligatorio. Texto de la tarea.' },
      { campo: 'descripcion',   desc: 'Opcional.' },
      { campo: 'estado',        desc: '"PENDIENTE" | "EN_PROGRESO" | "HECHO"' },
      { campo: 'prioridad',     desc: '"BAJA" | "MEDIA" | "ALTA"' },
      { campo: 'fechaInicio',   desc: 'Opcional. "YYYY-MM-DD"' },
      { campo: 'venceEn',       desc: 'Opcional. "YYYY-MM-DD"' },
      { campo: 'asignadoEmail', desc: 'Opcional. Solo se usa si eliges "Según el archivo"' },
    ],
  },
};

// Opciones de modo de asignación
const MODOS = [
  { key: 'yo',      label: 'Para mí',          icon: <User size={18} />, desc: 'Todas las tareas quedan asignadas a ti' },
  { key: 'miembro', label: 'Para un miembro',  icon: <Users size={18} />, desc: 'Elige quién será el responsable' },
  { key: 'archivo', label: 'Según el archivo', icon: <FileText size={18} />, desc: 'Usa la columna asignadoEmail del archivo' },
];

const ModalImportar = ({ proyectoId, usuarios = [], usuarioActual, onClose, onImportado }) => {
  const [tab, setTab]                 = useState('excel');
  const [archivo, setArchivo]         = useState(null);
  const [cargando, setCargando]       = useState(false);
  const [resultado, setResultado]     = useState(null);
  const [errorGlobal, setErrorGlobal] = useState('');
  // Asignación
  const [modo, setModo]               = useState('yo');
  const [miembroId, setMiembroId]     = useState('');
  const inputRef = useRef(null);

  const fmt = FORMAT_INFO[tab];

  const validarArchivo = (file, tipoActual) => {
    if (!file) return null;
    const nombre = String(file.name || '').toLowerCase();

    if (tipoActual === 'json' && !nombre.endsWith('.json')) {
      return 'El archivo seleccionado no es un JSON valido. Cambia a la pestana Excel o sube un archivo .json.';
    }

    if (tipoActual === 'excel' && !(nombre.endsWith('.xlsx') || nombre.endsWith('.xls'))) {
      return 'El archivo seleccionado no es un Excel valido. Cambia a la pestana JSON o sube un archivo .xlsx/.xls.';
    }

    return null;
  };

  const handleTabChange = (t) => {
    setTab(t);
    setArchivo(null);
    setResultado(null);
    setErrorGlobal('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    const errorArchivo = validarArchivo(file, tab);

    if (errorArchivo) {
      setArchivo(null);
      setResultado(null);
      setErrorGlobal(errorArchivo);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setArchivo(file);
    setResultado(null);
    setErrorGlobal('');
  };

  const handleImportar = async () => {
    if (!archivo) { setErrorGlobal('Selecciona un archivo antes de importar.'); return; }
    if (modo === 'miembro' && !miembroId) { setErrorGlobal('Selecciona un miembro.'); return; }

    setCargando(true);
    setErrorGlobal('');
    setResultado(null);

    try {
      const asignadoId = modo === 'miembro' ? miembroId : null;
      const data = await tareasService.importar(proyectoId, archivo, modo, asignadoId);
      setResultado(data);
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleCerrar = () => {
    if (resultado && resultado.creadas > 0 && onImportado) onImportado();
    onClose();
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div style={card}>

        {/* ── Cabecera ──────────────────────────────────────────────────── */}
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
            background: 'none', border: 'none', 
            color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}><X size={24} /></button>
        </div>

        {/* ── Selector de asignación ────────────────────────────────────── */}
        {!resultado && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
              ¿A quién asignar las tareas?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {MODOS.map(m => (
                <label key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  border: `1.5px solid ${modo === m.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '0.6rem', cursor: 'pointer',
                  background: modo === m.key ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="modoAsignacion"
                    value={m.key}
                    checked={modo === m.key}
                    onChange={() => setModo(m.key)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <div style={{ color: modo === m.key ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex' }}>
                    {m.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{m.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Selector de miembro cuando modo = 'miembro' */}
            {modo === 'miembro' && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--color-text-muted)' }}>
                  Miembro responsable:
                </label>
                <select
                  value={miembroId}
                  onChange={e => setMiembroId(e.target.value)}
                  className="form-input form-select"
                  style={{ width: '100%' }}
                >
                  <option value="">— Selecciona un miembro —</option>
                  {/* Incluir al usuario actual primero */}
                  {usuarioActual && (
                    <option value={usuarioActual.id}>
                      {usuarioActual.nombre} (yo)
                    </option>
                  )}
                  {usuarios
                    .filter(u => u.id !== usuarioActual?.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} — {u.email}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '0.25rem', marginBottom: '1rem',
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}>
              {FORMAT_INFO[t].icono} {FORMAT_INFO[t].label}
            </button>
          ))}
        </div>


        {/* ── Descarga de plantilla ──────────────────────────────────────── */}
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
          <Download size={14} /> Descargar plantilla de ejemplo ({fmt.label})
        </button>

        {/* ── Input de archivo (drag & drop) ────────────────────────────── */}
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
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (!f) return;

                const errorArchivo = validarArchivo(f, tab);
                if (errorArchivo) {
                  setArchivo(null);
                  setResultado(null);
                  setErrorGlobal(errorArchivo);
                  return;
                }

                setArchivo(f);
                setResultado(null);
                setErrorGlobal('');
              }}
            >
              <input ref={inputRef} type="file" accept={fmt.ext} style={{ display: 'none' }} onChange={handleFileChange} />
              {archivo ? (
                <div>
                  <div style={{ color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <File size={32} />
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{archivo.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {(archivo.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ color: 'var(--color-text-dim)', display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <UploadCloud size={40} />
                  </div>
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

        {/* ── Error global ───────────────────────────────────────────────── */}
        {errorGlobal && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '1rem',
            color: '#f87171', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <XCircle size={16} /> {errorGlobal}
          </div>
        )}

        {/* ── Resultados ────────────────────────────────────────────────── */}
        {resultado && (() => {
          const avisos        = resultado.errores?.filter(e => e.razon.startsWith('[AVISO]')) || [];
          const erroresFatales = resultado.errores?.filter(e => !e.razon.startsWith('[AVISO]')) || [];
          return (
            <div style={{ marginBottom: '1.25rem' }}>
              {resultado.creadas > 0 && (
                <div style={{
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                  color: '#34d399', fontSize: '0.95rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <CheckCircle2 size={18} /> {resultado.creadas} tarea{resultado.creadas !== 1 ? 's' : ''} creada{resultado.creadas !== 1 ? 's' : ''} correctamente
                </div>
              )}

              {resultado.creadas === 0 && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                  color: '#f87171', fontSize: '0.9rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <XCircle size={18} /> No se pudo importar ninguna tarea. Corrige los errores y vuelve a intentarlo.
                </div>
              )}

              {avisos.length > 0 && (
                <div style={{
                  background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#818cf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Info size={14} /> {avisos.length} aviso{avisos.length !== 1 ? 's' : ''}:
                  </p>
                  <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                    {avisos.map((e, i) => (
                      <li key={i} style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        <strong style={{ color: '#818cf8' }}>Fila {e.fila}:</strong>{' '}
                        {e.razon.replace('[AVISO] ', '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {erroresFatales.length > 0 && (
                <div style={{
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                  borderRadius: '0.6rem', padding: '0.75rem 1rem',
                }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fbbf24', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={14} /> {erroresFatales.length} fila{erroresFatales.length !== 1 ? 's' : ''} descartada{erroresFatales.length !== 1 ? 's' : ''} por errores:
                  </p>
                  <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                    {erroresFatales.map((e, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        <strong style={{ color: '#fbbf24' }}>Fila {e.fila}:</strong> {e.razon}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Acciones ──────────────────────────────────────────────────── */}
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
              style={{ flex: 1.5, padding: '0.75rem', fontSize: '0.9rem', opacity: !archivo ? 0.5 : 1 }}
            >
              {cargando ? '⏳ Procesando...' : '📥 Importar'}
            </button>
          )}

          {resultado && resultado.creadas === 0 && (
            <button
              onClick={() => { setResultado(null); setArchivo(null); setErrorGlobal(''); if (inputRef.current) inputRef.current.value = ''; }}
              className="btn-primary"
              style={{ flex: 1.5, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <RotateCcw size={16} /> Reintentar
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ModalImportar;
