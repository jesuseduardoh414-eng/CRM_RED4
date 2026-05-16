import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  Clock,
  Coffee,
  Trash2,
  Plus,
  Home,
  Plane,
  FileText,
  Sun,
  Gift,
} from 'lucide-react';
import { agendaService } from '../services/api';
import RangeDatePicker from './RangeDatePicker';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TIPOS_DIA = [
  { id: 'festivo', label: 'Festivo', color: '#ef4444', icon: <Sun size={14} /> },
  { id: 'vacacion', label: 'Vacación', color: '#10b981', icon: <Plane size={14} /> },
  { id: 'permiso', label: 'Permiso', color: '#f59e0b', icon: <FileText size={14} /> },
  { id: 'homeoffice', label: 'Home Office', color: '#3b82f6', icon: <Home size={14} /> },
  { id: 'cumpleanos', label: 'Cumpleaños', color: '#ec4899', icon: <Gift size={14} /> },
];

const CONFIG_DEFAULT = {
  dias_laborales: [1, 2, 3, 4, 5],
  hora_entrada: '09:00',
  hora_salida: '18:00',
  hora_comida_inicio: '14:00',
  hora_comida_fin: '15:00',
};

const normalizarConfig = (config) => ({
  dias_laborales: config?.diasLaborales || config?.dias_laborales || CONFIG_DEFAULT.dias_laborales,
  hora_entrada: config?.horaEntrada || config?.hora_entrada || CONFIG_DEFAULT.hora_entrada,
  hora_salida: config?.horaSalida || config?.hora_salida || CONFIG_DEFAULT.hora_salida,
  hora_comida_inicio: config?.horaComidaInicio || config?.hora_comida_inicio || CONFIG_DEFAULT.hora_comida_inicio,
  hora_comida_fin: config?.horaComidaFin || config?.hora_comida_fin || CONFIG_DEFAULT.hora_comida_fin,
});

const ModalConfiguracionAgenda = ({ onClose, showToast }) => {
  const [tab, setTab] = useState('HORARIO');
  const [cargando, setCargando] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [config, setConfig] = useState(CONFIG_DEFAULT);
  const [diasEspeciales, setDiasEspeciales] = useState([]);
  const [nuevoDia, setNuevoDia] = useState({
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    tipo: 'festivo',
    descripcion: '',
  });

  const cargarDatos = useCallback(async () => {
    try {
      setCargandoInicial(true);
      const [resConfig, resDias] = await Promise.all([
        agendaService.getConfigLaboral(),
        agendaService.listarDiasEspeciales(new Date().getMonth() + 1, new Date().getFullYear()),
      ]);

      setConfig(normalizarConfig(resConfig.config));
      setDiasEspeciales(resDias.dias || []);
    } catch (err) {
      showToast(err.message || 'Error al cargar la configuración', 'error');
    } finally {
      setCargandoInicial(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSaveConfig = async () => {
    setCargando(true);
    try {
      await agendaService.updateConfigLaboral(config);
      showToast('Configuración guardada correctamente');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleAddDia = async () => {
    try {
      await agendaService.crearDiaEspecial(nuevoDia);
      showToast('Día especial marcado');
      await cargarDatos();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelDia = async (id) => {
    try {
      await agendaService.eliminarDiaEspecial(id);
      showToast('Día eliminado');
      await cargarDatos();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '600px', background: 'var(--color-surface)', padding: '0', borderRadius: '2rem', overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setTab('HORARIO')} style={{ flex: 1, padding: '1.5rem', border: 'none', background: tab === 'HORARIO' ? 'var(--color-surface)' : 'var(--color-surface-2)', fontSize: '0.9rem', fontWeight: '800', color: tab === 'HORARIO' ? 'var(--color-primary)' : 'var(--color-text-dim)', cursor: 'pointer', borderBottom: tab === 'HORARIO' ? '3px solid var(--color-primary)' : 'none' }}>HORARIO LABORAL</button>
          <button onClick={() => setTab('DIAS')} style={{ flex: 1, padding: '1.5rem', border: 'none', background: tab === 'DIAS' ? 'var(--color-surface)' : 'var(--color-surface-2)', fontSize: '0.9rem', fontWeight: '800', color: tab === 'DIAS' ? 'var(--color-primary)' : 'var(--color-text-dim)', cursor: 'pointer', borderBottom: tab === 'DIAS' ? '3px solid var(--color-primary)' : 'none' }}>DIAS ESPECIALES</button>
          <button onClick={onClose} style={{ padding: '1rem', border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '2.5rem' }}>
          {cargandoInicial ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-dim)', fontWeight: '700' }}>
              Cargando configuración...
            </div>
          ) : tab === 'HORARIO' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="form-group">
                <label className="form-label">DIAS LABORALES</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {DIAS.map((dia, i) => {
                    const diaId = i + 1;
                    const isActive = (config?.dias_laborales || []).includes(diaId);
                    return (
                      <button
                        key={dia}
                        onClick={() => {
                          const nuevosDias = isActive
                            ? (config.dias_laborales || []).filter((x) => x !== diaId)
                            : [...(config.dias_laborales || []), diaId];
                          setConfig({ ...config, dias_laborales: nuevosDias });
                        }}
                        style={{ width: '40px', height: '40px', borderRadius: '10px', border: '2px solid', borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)', background: isActive ? 'var(--color-primary)' : 'transparent', color: isActive ? '#fff' : 'var(--color-text-dim)', fontWeight: '900', cursor: 'pointer', transition: '0.2s' }}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={14} /> HORARIO LABORAL</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>INICIO</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_entrada} onChange={(e) => setConfig({ ...config, hora_entrada: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>FIN</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_salida} onChange={(e) => setConfig({ ...config, hora_salida: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Coffee size={14} /> HORA DE COMIDA</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>INICIO</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_comida_inicio} onChange={(e) => setConfig({ ...config, hora_comida_inicio: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>FIN</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_comida_fin} onChange={(e) => setConfig({ ...config, hora_comida_fin: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleSaveConfig} disabled={cargando} className="btn-primary" style={{ marginTop: '1rem', height: '54px' }}>
                <Save size={20} /> {cargando ? 'GUARDANDO...' : 'GUARDAR CONFIGURACION'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">RANGO DE FECHAS</label>
                    <RangeDatePicker
                      from={nuevoDia.fecha_inicio ? new Date(`${nuevoDia.fecha_inicio}T12:00:00`) : undefined}
                      to={nuevoDia.fecha_fin ? new Date(`${nuevoDia.fecha_fin}T12:00:00`) : undefined}
                      onChange={(range) => setNuevoDia((prev) => ({
                        ...prev,
                        fecha_inicio: range?.from ? range.from.toISOString().split('T')[0] : prev.fecha_inicio,
                        fecha_fin: range?.to ? range.to.toISOString().split('T')[0] : (range?.from ? range.from.toISOString().split('T')[0] : prev.fecha_fin),
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TIPO</label>
                    <select className="form-input form-select" value={nuevoDia.tipo} onChange={(e) => setNuevoDia({ ...nuevoDia, tipo: e.target.value })}>
                      {TIPOS_DIA.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">MOTIVO / DESCRIPCION</label>
                  <input className="form-input" placeholder="Ej. Navidad, Vacaciones..." value={nuevoDia.descripcion} onChange={(e) => setNuevoDia({ ...nuevoDia, descripcion: e.target.value })} />
                </div>
                <button
                  onClick={handleAddDia}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: '900',
                  }}
                >
                  <Plus size={18} /> MARCAR DIA ESPECIAL
                </button>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>DIAS MARCADOS ESTE MES</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {diasEspeciales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>No hay días especiales registrados</div>
                  ) : (
                    diasEspeciales.map((dia) => {
                      const tipo = TIPOS_DIA.find((x) => x.id === dia.tipo);
                      return (
                        <div key={dia.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${tipo?.color || '#94a3b8'}20`, color: tipo?.color || '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {tipo?.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>
                              {new Date(dia.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - {dia.descripcion || tipo?.label}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '700' }}>{tipo?.label}</div>
                          </div>
                          <button onClick={() => handleDelDia(dia.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.5rem' }}><Trash2 size={16} /></button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalConfiguracionAgenda;
