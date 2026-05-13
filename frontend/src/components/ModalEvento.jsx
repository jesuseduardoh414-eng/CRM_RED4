import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  Bell, 
  Users,
  Check,
  AlertTriangle,
  Hash,
  Trash2,
  Globe,
  Clock,
  RefreshCw
} from 'lucide-react';
import { agendaService, usuariosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DIAS_SEMANA = [
  { id: 1, label: 'L', full: 'Lunes' },
  { id: 2, label: 'M', full: 'Martes' },
  { id: 3, label: 'X', full: 'Miércoles' },
  { id: 4, label: 'J', full: 'Jueves' },
  { id: 5, label: 'V', full: 'Viernes' },
  { id: 6, label: 'S', full: 'Sábado' },
  { id: 0, label: 'D', full: 'Domingo' },
];

const COLORES = [
  { hex: '#4a90d9', label: 'Azul' },
  { hex: '#27ae60', label: 'Verde' },
  { hex: '#e67e22', label: 'Naranja' },
  { hex: '#e74c3c', label: 'Rojo' },
  { hex: '#9b59b6', label: 'Morado' },
  { hex: '#95a5a6', label: 'Gris' },
];

const TIPOS = [
  { id: 'evento', label: 'Evento', icon: <Calendar size={16} /> },
  { id: 'recordatorio', label: 'Recordatorio', icon: <Bell size={16} /> },
  { id: 'dia_completo', label: 'Día completo', icon: <Hash size={16} /> },
];

// Las alertas se manejan ahora internamente o se simplificaron

const ModalEvento = ({ evento, prefill, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(() => {
    if (evento) {
      const start = new Date(evento.fechaInicio);
      const end = evento.fechaFin ? new Date(evento.fechaFin) : null;
      let patronParsed = null;
      try { patronParsed = evento.patronRecurrencia ? JSON.parse(evento.patronRecurrencia) : null; } catch {}
      return {
        titulo: evento.titulo,
        descripcion: evento.descripcion || '',
        tipo: evento.tipo,
        fecha_inicio: start.toISOString().split('T')[0],
        hora_inicio: start.toTimeString().slice(0, 5),
        fecha_fin: end ? end.toISOString().split('T')[0] : start.toISOString().split('T')[0],
        hora_fin: end ? end.toTimeString().slice(0, 5) : '10:00',
        todo_el_dia: evento.todoElDia,
        color: evento.color,
        alerta_minutos: evento.alertaMinutos || 15,
        es_compartido: evento.esCompartido || false,
        es_global: evento.esGlobal || false,
        proyecto_id: evento.proyectoId || '',
        invitados_ids: evento.invitados?.map(i => i.usuarioId) || [],
        es_recurrente: evento.esRecurrente || false,
        recur_dias: patronParsed?.dias || [],
        recur_hora_inicio: patronParsed?.horaInicio || '00:00',
        recur_hora_fin: patronParsed?.horaFin || '23:59',
        fecha_fin_recurrencia: evento.fechaFinRecurr ? new Date(evento.fechaFinRecurr).toISOString().split('T')[0] : '',
      };
    }
    if (prefill) {
      const start = prefill.fechaInicio || new Date();
      return {
        titulo: '',
        descripcion: '',
        tipo: 'evento',
        fecha_inicio: start.toISOString().split('T')[0],
        hora_inicio: start.toTimeString().slice(0, 5),
        fecha_fin: start.toISOString().split('T')[0],
        hora_fin: '10:00',
        todo_el_dia: false,
        color: '#4a90d9',
        alerta_minutos: 15,
        es_compartido: false,
        es_global: false,
        proyecto_id: '',
        invitados_ids: [],
        es_recurrente: false,
        recur_dias: [],
        recur_hora_inicio: '00:00',
        recur_hora_fin: '23:59',
        fecha_fin_recurrencia: '',
      };
    }
    return {
      titulo: '',
      descripcion: '',
      tipo: 'evento',
      fecha_inicio: '',
      hora_inicio: '09:00',
      fecha_fin: '',
      hora_fin: '10:00',
      todo_el_dia: false,
      color: '#4a90d9',
      alerta_minutos: 15,
      es_compartido: false,
      es_global: false,
      proyecto_id: '',
      invitados_ids: [],
      es_recurrente: false,
      recur_dias: [],
      recur_hora_inicio: '00:00',
      recur_hora_fin: '23:59',
      fecha_fin_recurrencia: '',
    };
  });

  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);

  // Seguridad: Solo el dueño puede editar
  const esDuenio = !evento || evento.usuarioId === usuario?.id || evento.creadoPorId === usuario?.id;

  useEffect(() => {
    const cargar = async () => {
      try {
        const resU = await usuariosService.listar();
        setUsuarios(resU.usuarios || []);
      } catch (err) {
        console.error(err);
      }
    };
    cargar();
  }, []);

  // Consultar disponibilidad al cambiar invitados o fecha
  useEffect(() => {
    if (form.es_compartido && !form.es_global && form.invitados_ids.length > 0 && form.fecha_inicio) {
      const fetchDisp = async () => {
        try {
          const res = await agendaService.consultarDisponibilidad({
            usuarios_ids: form.invitados_ids.join(','),
            inicio: `${form.fecha_inicio}T${form.hora_inicio || '00:00'}`,
            fin: `${form.fecha_fin || form.fecha_inicio}T${form.hora_fin || '23:59'}`
          });
          setDisponibilidad(res.conflictos || []);
        } catch (err) {
          console.error('Error disponibilidad', err);
        }
      };
      fetchDisp();
    } else {
      setDisponibilidad(prev => prev.length > 0 ? [] : prev);
    }
  }, [form.es_compartido, form.es_global, form.invitados_ids, form.fecha_inicio, form.hora_inicio, form.fecha_fin, form.hora_fin]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.es_recurrente && form.recur_dias.length === 0) {
      showToast('Selecciona al menos un día de la semana para el evento recurrente.', 'error');
      return;
    }

    setCargando(true);
    try {
      const fInicio = new Date(`${form.fecha_inicio}T${form.hora_inicio || '00:00'}`);
      let fFin = null;
      if (form.tipo === 'evento') fFin = new Date(`${form.fecha_fin}T${form.hora_fin || '23:59'}`);
      else if (form.tipo === 'dia_completo') fFin = new Date(`${form.fecha_fin}T23:59:59`);

      const payload = {
        ...form,
        fecha_inicio: fInicio.toISOString(),
        fecha_fin: fFin ? fFin.toISOString() : null,
        todo_el_dia: form.tipo === 'dia_completo' ? true : form.todo_el_dia,
        proyecto_id: form.proyecto_id ? parseInt(form.proyecto_id) : null,
        patron_recurrencia: form.es_recurrente ? {
          tipo: 'semanal',
          dias: form.recur_dias,
          horaInicio: form.recur_hora_inicio,
          horaFin: form.recur_hora_fin,
        } : null,
        fecha_fin_recurrencia: form.fecha_fin_recurrencia || null,
      };

      if (evento) await agendaService.editar(evento.id, payload);
      else await agendaService.crear(payload);

      onSave();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const togggleInvitado = (userId) => {
    setForm(prev => {
      const ids = [...prev.invitados_ids];
      const idx = ids.indexOf(userId);
      if (idx > -1) ids.splice(idx, 1);
      else ids.push(userId);
      return { ...prev, invitados_ids: ids };
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '95%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', padding: '2rem', borderRadius: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
            {!evento ? 'Nuevo Evento' : (esDuenio ? 'Editar Evento' : 'Detalles del Evento')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Título y Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ letterSpacing: '0.05em' }}>TÍTULO DEL EVENTO</label>
              <input className="form-input" style={{ fontSize: '1rem', padding: '0.85rem 1.25rem' }} value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required placeholder="¿De qué trata la reunión?" disabled={!esDuenio} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ letterSpacing: '0.05em' }}>CATEGORÍA</label>
              <select className="form-input form-select" style={{ fontSize: '1rem', padding: '0.85rem 1.25rem' }} value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} disabled={!esDuenio}>
                {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ letterSpacing: '0.05em' }}>COMIENZA</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '40px', color: 'var(--color-text-dim)' }}>DÍA</span>
                   <input type="date" className="form-input" style={{ flex: 1 }} value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} required />
                </div>
                {form.tipo === 'evento' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '40px', color: 'var(--color-text-dim)' }}>HORA</span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)', paddingRight: '0.75rem' }}>
                      <input type="time" className="form-input" style={{ border: 'none', background: 'transparent' }} value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} disabled={!esDuenio} />
                      <Clock size={14} color="var(--color-text-dim)" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ letterSpacing: '0.05em' }}>TERMINA</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '40px', color: 'var(--color-text-dim)' }}>DÍA</span>
                   <input type="date" className="form-input" style={{ flex: 1 }} value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} />
                </div>
                {form.tipo === 'evento' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', width: '40px', color: 'var(--color-text-dim)' }}>HORA</span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)', paddingRight: '0.75rem' }}>
                      <input type="time" className="form-input" style={{ border: 'none', background: 'transparent' }} value={form.hora_fin} onChange={e => setForm({...form, hora_fin: e.target.value})} disabled={!esDuenio} />
                      <Clock size={14} color="var(--color-text-dim)" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colores */}
          <div className="form-group">
            <label className="form-label" style={{ letterSpacing: '0.05em' }}>IDENTIFICADOR VISUAL</label>
            <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0', flexWrap: 'wrap' }}>
              {COLORES.map(c => (
                <button 
                  key={c.hex} 
                  type="button" 
                  onClick={() => esDuenio && setForm({...form, color: c.hex})} 
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '10px', background: c.hex, 
                    border: form.color === c.hex ? '3px solid #fff' : 'none', 
                    boxShadow: form.color === c.hex ? `0 0 0 2px ${c.hex}, 0 4px 12px ${c.hex}66` : 'none', 
                    cursor: esDuenio ? 'pointer' : 'default', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: form.color === c.hex ? 'scale(1.1)' : 'scale(1)'
                  }} 
                />
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-light)', margin: '0.5rem 0' }} />

          {/* COMPARTIR */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--color-surface-2)', borderRadius: '1.5rem', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: '12px' }}>
                <Users size={22} color="var(--color-primary)" />
              </div>
              <div>
                <div style={{ fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.01em' }}>Colaboración</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontWeight: '500' }}>Define quién puede ver este evento</div>
              </div>
            </div>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
              <input type="checkbox" checked={form.es_compartido} onChange={e => setForm({...form, es_compartido: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} disabled={!esDuenio} />
              <span className="slider" style={{ position: 'absolute', cursor: esDuenio ? 'pointer' : 'default', top: 0, left: 0, right: 0, bottom: 0, background: form.es_compartido ? 'var(--color-primary)' : '#cbd5e1', transition: '.4s', borderRadius: '34px' }}>
                <span style={{ position: 'absolute', height: '20px', width: '20px', left: form.es_compartido ? '26px' : '4px', bottom: '4px', background: 'white', transition: '.4s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
              </span>
            </label>
          </div>

          {form.es_compartido && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '1.5rem', background: 'var(--color-surface)' }}>
              
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg-base)', padding: '0.5rem', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                <button 
                  type="button"
                  onClick={() => setForm({...form, es_global: true, invitados_ids: []})}
                  style={{ 
                    flex: 1, padding: '0.85rem', borderRadius: '10px', border: 'none', 
                    fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', 
                    background: form.es_global ? 'var(--color-primary)' : 'transparent', 
                    color: form.es_global ? '#fff' : 'var(--color-text-dim)', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: form.es_global ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                  }}
                >TODO EL EQUIPO</button>
                <button 
                  type="button"
                  onClick={() => setForm({...form, es_global: false})}
                  style={{ 
                    flex: 1, padding: '0.85rem', borderRadius: '10px', border: 'none', 
                    fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', 
                    background: !form.es_global ? 'var(--color-primary)' : 'transparent', 
                    color: !form.es_global ? '#fff' : 'var(--color-text-dim)', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: !form.es_global ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                  }}
                >MIEMBROS ESPECÍFICOS</button>
              </div>

              {!form.es_global ? (
                <>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--color-primary)', letterSpacing: '0.05em' }}>SELECCIONAR MIEMBROS DEL EQUIPO</label>
                    <div style={{ 
                      display: 'flex', flexDirection: 'column', gap: '0.5rem', 
                      maxHeight: '180px', overflowY: 'auto', padding: '0.75rem',
                      background: 'var(--color-bg-base)', borderRadius: '1.25rem', border: '1px solid var(--color-border)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      {usuarios.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', textAlign: 'center', padding: '2rem' }}>No hay otros miembros disponibles</div>
                      ) : (
                        usuarios.filter(u => u.id !== usuario?.id).map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => togggleInvitado(u.id)}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', 
                              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                              background: form.invitados_ids.includes(u.id) ? 'var(--color-surface)' : 'transparent',
                              border: '1px solid',
                              borderColor: form.invitados_ids.includes(u.id) ? 'var(--color-primary)' : 'transparent',
                              boxShadow: form.invitados_ids.includes(u.id) ? 'var(--shadow-sm)' : 'none'
                            }}
                          >
                            <div style={{ 
                              width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary) 0%, #4338ca 100%)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: '900',
                              boxShadow: '0 4px 6px -1px rgba(99,102,241,0.2)'
                            }}>
                              {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: form.invitados_ids.includes(u.id) ? 'var(--color-primary)' : 'var(--color-text)' }}>{u.nombre}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: '500' }}>{u.email}</div>
                            </div>
                            <div style={{ 
                              width: '24px', height: '24px', borderRadius: '50%', border: '2px solid',
                              borderColor: form.invitados_ids.includes(u.id) ? 'var(--color-success)' : 'var(--color-border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: form.invitados_ids.includes(u.id) ? 'var(--color-success)' : 'transparent',
                              transition: 'all 0.2s'
                            }}>
                              {form.invitados_ids.includes(u.id) && <Check size={14} color="#fff" strokeWidth={3} />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    {form.invitados_ids.map(id => {
                      const u = usuarios.find(x => x.id === id);
                      if (!u) return null;
                      return (
                        <div key={`chip-${id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem', background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900', border: '1px solid rgba(99,102,241,0.2)' }}>
                          {u.nombre}
                          <X size={14} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => togggleInvitado(id)} />
                        </div>
                      );
                    })}
                  </div>

                  {form.invitados_ids.length > 0 && disponibilidad.length > 0 && (
                    <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <AlertTriangle size={16} /> Conflictos detectados ({disponibilidad.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {disponibilidad.slice(0, 3).map((d, idx) => (
                          <div key={`disp-${d.id || idx}`} style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600', paddingLeft: '0.5rem', borderLeft: '2px solid #b45309' }}>Ocupado de {new Date(d.fechaInicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} a {new Date(d.fechaFin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '1.25rem', background: 'rgba(99,102,241,0.05)', borderRadius: '1.25rem', border: '1px dashed var(--color-primary)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                   <div style={{ padding: '0.5rem', background: 'var(--color-primary)', borderRadius: '10px', color: '#fff' }}>
                     <Globe size={18} />
                   </div>
                   <div>
                     <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: '900', marginBottom: '0.2rem' }}>Evento Público</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', opacity: 0.8, fontWeight: '500', lineHeight: 1.4 }}>Este evento aparecerá automáticamente en el calendario de todos los miembros del CRM.</div>
                   </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingBottom: '1rem' }}>
            {evento && esDuenio && (
              <button 
                type="button" 
                onClick={() => onDelete(evento.id)}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#f87171', 
                  width: '56px', height: '56px', borderRadius: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <Trash2 size={24} />
              </button>
            )}
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '1.25rem', fontWeight: '800', fontSize: '0.9rem', color: 'var(--color-text-dim)', cursor: 'pointer', transition: 'all 0.2s' }}>{esDuenio ? 'CANCELAR' : 'CERRAR'}</button>
            {esDuenio && (
              <button type="submit" disabled={cargando} className="btn-primary" style={{ flex: 2, padding: '1rem', fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                <Save size={20} /> {cargando ? 'GUARDANDO...' : (evento ? 'ACTUALIZAR EVENTO' : 'CREAR EVENTO')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEvento;
