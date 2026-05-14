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
  Sun
} from 'lucide-react';
import { agendaService } from '../services/api';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TIPOS_DIA = [
  { id: 'festivo', label: 'Festivo', color: '#ef4444', icon: <Sun size={14} /> },
  { id: 'vacacion', label: 'Vacación', color: '#10b981', icon: <Plane size={14} /> },
  { id: 'permiso', label: 'Permiso', color: '#f59e0b', icon: <FileText size={14} /> },
  { id: 'homeoffice', label: 'Home Office', color: '#3b82f6', icon: <Home size={14} /> },
];

const ModalConfiguracionAgenda = ({ onClose, showToast }) => {
  const [tab, setTab] = useState('HORARIO');
  const [cargando, setCargando] = useState(false);
  
  // Horario Laboral
  const [config, setConfig] = useState({
    dias_laborales: [1, 2, 3, 4, 5],
    hora_entrada: '09:00',
    hora_salida: '18:00',
    hora_comida_inicio: '14:00',
    hora_comida_fin: '15:00'
  });

  // Días Especiales
  const [diasEspeciales, setDiasEspeciales] = useState([]);
  const [nuevoDia, setNuevoDia] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'festivo',
    descripcion: ''
  });

  const cargarDatos = useCallback(async () => {
    try {
      const [resC, resD] = await Promise.all([
        agendaService.getConfigLaboral(),
        agendaService.listarDiasEspeciales(new Date().getMonth() + 1, new Date().getFullYear())
      ]);
      if (resC.config) {
        setConfig({
          dias_laborales: resC.config.diasLaborales || [1,2,3,4,5],
          hora_entrada: resC.config.horaEntrada || '09:00',
          hora_salida: resC.config.horaSalida || '18:00',
          hora_comida_inicio: resC.config.horaComidaInicio || '14:00',
          hora_comida_fin: resC.config.horaComidaFin || '15:00'
        });
      }
      setDiasEspeciales(resD.dias || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    if (mounted) setTimeout(cargarDatos, 0);
    return () => { mounted = false; };
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
      cargarDatos();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelDia = async (id) => {
    try {
      await agendaService.eliminarDiaEspecial(id);
      showToast('Día eliminado');
      cargarDatos();
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
        
        {/* Header Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setTab('HORARIO')} style={{ flex: 1, padding: '1.5rem', border: 'none', background: tab === 'HORARIO' ? 'var(--color-surface)' : 'var(--color-surface-2)', fontSize: '0.9rem', fontWeight: '800', color: tab === 'HORARIO' ? 'var(--color-primary)' : 'var(--color-text-dim)', cursor: 'pointer', transition: '0.2s', borderBottom: tab === 'HORARIO' ? '3px solid var(--color-primary)' : 'none' }}>HORARIO LABORAL</button>
          <button onClick={() => setTab('DIAS')} style={{ flex: 1, padding: '1.5rem', border: 'none', background: tab === 'DIAS' ? 'var(--color-surface)' : 'var(--color-surface-2)', fontSize: '0.9rem', fontWeight: '800', color: tab === 'DIAS' ? 'var(--color-primary)' : 'var(--color-text-dim)', cursor: 'pointer', transition: '0.2s', borderBottom: tab === 'DIAS' ? '3px solid var(--color-primary)' : 'none' }}>DÍAS ESPECIALES</button>
          <button onClick={onClose} style={{ padding: '1rem', border: 'none', background: 'var(--color-surface-2)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '2.5rem' }}>
          
          {tab === 'HORARIO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="form-group">
                <label className="form-label">DÍAS LABORALES</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {DIAS.map((d, i) => {
                    const diaId = i + 1;
                    const isActive = (config?.dias_laborales || []).includes(diaId);
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          const newDias = isActive ? (config.dias_laborales || []).filter(x => x !== diaId) : [...(config.dias_laborales || []), diaId];
                          setConfig({...config, dias_laborales: newDias});
                        }}
                        style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          border: '2px solid',
                          borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                          background: isActive ? 'var(--color-primary)' : 'transparent',
                          color: isActive ? '#fff' : 'var(--color-text-dim)',
                          fontWeight: '900', cursor: 'pointer', transition: '0.2s'
                        }}
                      >
                        {d}
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
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_entrada} onChange={e => setConfig({...config, hora_entrada: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>FIN</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_salida} onChange={e => setConfig({...config, hora_salida: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Coffee size={14} /> HORA DE COMIDA</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>INICIO</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_comida_inicio} onChange={e => setConfig({...config, hora_comida_inicio: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '50px', color: 'var(--color-text-dim)' }}>FIN</span>
                      <input type="time" className="form-input" style={{ flex: 1 }} value={config.hora_comida_fin} onChange={e => setConfig({...config, hora_comida_fin: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleSaveConfig} disabled={cargando} className="btn-primary" style={{ marginTop: '1rem', height: '54px' }}>
                <Save size={20} /> {cargando ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
              </button>
            </div>
          )}

          {tab === 'DIAS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">FECHA</label>
                    <input type="date" className="form-input" value={nuevoDia.fecha} onChange={e => setNuevoDia({...nuevoDia, fecha: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TIPO</label>
                    <select className="form-input form-select" value={nuevoDia.tipo} onChange={e => setNuevoDia({...nuevoDia, tipo: e.target.value})}>
                      {TIPOS_DIA.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">MOTIVO / DESCRIPCIÓN</label>
                  <input className="form-input" placeholder="Ej. Navidad, Vacaciones..." value={nuevoDia.descripcion} onChange={e => setNuevoDia({...nuevoDia, descripcion: e.target.value})} />
                </div>
                <button onClick={handleAddDia} className="btn-primary" style={{ width: '100%', height: '48px', background: 'var(--color-secondary)' }}>
                  <Plus size={18} /> MARCAR DÍA ESPECIAL
                </button>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>Días marcados este mes</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {diasEspeciales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>No hay días especiales registrados</div>
                  ) : (
                    diasEspeciales.map(d => {
                      const t = TIPOS_DIA.find(x => x.id === d.tipo);
                      return (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: t?.color + '20', color: t?.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t?.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{new Date(d.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} — {d.descripcion || t?.label}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '700' }}>{t?.label}</div>
                          </div>
                          <button onClick={() => handleDelDia(d.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.5rem' }}><Trash2 size={16} /></button>
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
