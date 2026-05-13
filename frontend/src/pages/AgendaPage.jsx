import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock,
  List,
  LayoutGrid,
  Columns,
  Settings,
  Mail,
  Users,
  X,
  Trash2,
  Edit2,
  Globe
} from 'lucide-react';
import { agendaService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ModalEvento from '../components/ModalEvento';
import ModalConfiguracionAgenda from '../components/ModalConfiguracionAgenda';
import Spinner from '../components/Spinner';

// ── Constantes ──────────────────────────────────────────────────────────────
const VISTAS = [
  { id: 'MES',     label: 'Mes',    icon: <LayoutGrid size={16} /> },
  { id: 'SEMANA',  label: 'Semana', icon: <Columns size={16} /> },
  { id: 'DIA',     label: 'Día',    icon: <List size={16} /> },
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const formatFechaLarga = (date) => date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', day: 'numeric' });
const formatMesAnio = (date) => date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

const getHoras = (start = 0, end = 23) => {
  const horas = [];
  for (let i = start; i <= end; i++) horas.push(`${i.toString().padStart(2, '0')}:00`);
  return horas;
};

// ── Componente Principal ─────────────────────────────────────────────────────
const AgendaPage = () => {
  const { showToast } = useToast();
  const { usuario } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('MES');
  const [eventos, setEventos] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [configLaboral, setConfigLaboral] = useState(null);
  const [diasEspeciales, setDiasEspeciales] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [showInvitaciones, setShowInvitaciones] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      const mes = currentDate.getMonth() + 1;
      const anio = currentDate.getFullYear();
      
      const [resE, resI, resC, resD] = await Promise.all([
        agendaService.listar(null, null), // El backend expande recurrencias
        agendaService.invitacionesPendientes(),
        agendaService.getConfigLaboral(),
        agendaService.listarDiasEspeciales(mes, anio)
      ]);

      setEventos(resE.eventos || []);
      setInvitaciones(resI.invitaciones || []);
      setConfigLaboral(resC.config || null);
      setDiasEspeciales(resD.dias || []);
    } catch (err) {
      showToast('Error al cargar la agenda', 'error');
    } finally {
      setCargando(false);
    }
  }, [currentDate, showToast]);

  useEffect(() => {
    const fetch = async () => {
      await cargarDatos();
    };
    fetch();
  }, [cargarDatos]);

  const nav = {
    next: () => {
      const d = new Date(currentDate);
      if (view === 'MES') d.setMonth(d.getMonth() + 1);
      else if (view === 'SEMANA') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    },
    prev: () => {
      const d = new Date(currentDate);
      if (view === 'MES') d.setMonth(d.getMonth() - 1);
      else if (view === 'SEMANA') d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    },
    hoy: () => setCurrentDate(new Date())
  };

  const handleResponder = async (eventoId, respuesta) => {
    try {
      await agendaService.responderInvitacion(eventoId, respuesta);
      showToast(`Invitación ${respuesta === 'aceptado' ? 'aceptada' : 'rechazada'}`);
      cargarDatos();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    try {
      await agendaService.eliminar(id);
      showToast('Evento eliminado');
      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  if (cargando && !eventos.length) return <Spinner />;

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      
      {/* Header con Navegación y Vistas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '2rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', letterSpacing: '-0.03em', margin: 0 }}>
            {view === 'MES' ? formatMesAnio(currentDate).toUpperCase() : formatFechaLarga(currentDate)}
          </h1>
          <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button onClick={nav.prev} className="btn-icon-sm" style={{ width: '28px', height: '28px' }}><ChevronLeft size={16} /></button>
              <button onClick={nav.hoy} style={{ padding: '0 0.5rem', fontSize: '0.7rem', fontWeight: '800', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>HOY</button>
              <button onClick={nav.next} className="btn-icon-sm" style={{ width: '28px', height: '28px' }}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowInvitaciones(!showInvitaciones)}
            style={{ position: 'relative', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '0.6rem', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Mail size={18} color={invitaciones.length > 0 ? 'var(--color-primary)' : 'var(--color-text-dim)'} />
            {invitaciones.length > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--color-error)', color: '#fff', fontSize: '0.6rem', fontWeight: '900', padding: '1px 5px', borderRadius: '10px', border: '2px solid var(--color-surface)' }}>
                {invitaciones.length}
              </span>
            )}
          </button>

          {!isMobile && (
            <button 
              onClick={() => setModalConfigOpen(true)}
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '0.6rem', borderRadius: '10px', cursor: 'pointer' }}
            >
              <Settings size={18} color="var(--color-text-dim)" />
            </button>
          )}

          <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            {VISTAS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', background: view === v.id ? 'var(--color-primary)' : 'transparent', color: view === v.id ? '#fff' : 'var(--color-text-muted)', transition: 'all 0.2s' }}>
                {v.icon} {!isMobile && v.label}
              </button>
            ))}
          </div>
          
          <button onClick={() => { setSelectedEvent(null); setPrefillData(null); setModalOpen(true); }} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={18} /> {!isMobile && "Nuevo evento"}
          </button>
        </div>
      </div>

      {/* Invitaciones Pendientes (Panel Lateral) */}
      {showInvitaciones && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: isMobile ? '100%' : '400px', background: 'var(--color-surface)', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 1100, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: '900', fontSize: '1.5rem' }}>Invitaciones</h2>
            <button onClick={() => setShowInvitaciones(false)} className="btn-icon-sm"><X size={20} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {invitaciones.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', marginTop: '2rem' }}>No tienes invitaciones pendientes</p>
            ) : (
              invitaciones.map(inv => (
                <div key={inv.id} style={{ padding: '1.25rem', background: 'var(--color-surface-2)', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: '800', marginBottom: '0.25rem' }}>{inv.evento.titulo}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                    Organiza: <b>{inv.evento.creador?.nombre}</b><br/>
                    {new Date(inv.evento.fechaInicio).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleResponder(inv.evento.id, 'aceptado')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>ACEPTAR</button>
                    <button onClick={() => handleResponder(inv.evento.id, 'rechazado')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-dim)', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>RECHAZAR</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Grid Calendario */}
      <div className="card" style={{ padding: '0', borderRadius: isMobile ? '1rem' : '2rem', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-xl)' }}>
        {view === 'MES' && <VistaMensual date={currentDate} eventos={eventos} diasEspeciales={diasEspeciales} configLaboral={configLaboral} currentUserId={usuario?.id} isMobile={isMobile} onSelectEvent={(e) => { setSelectedEvent(e); setModalOpen(true); }} onSelectDate={(d) => { setPrefillData(d); setModalOpen(true); }} />}
        {view === 'SEMANA' && <VistaSemanal date={currentDate} eventos={eventos} configLaboral={configLaboral} currentUserId={usuario?.id} isMobile={isMobile} onSelectEvent={(e) => { setSelectedEvent(e); setModalOpen(true); }} onSelectDate={(d) => { setPrefillData(d); setModalOpen(true); }} />}
        {view === 'DIA' && <VistaDiaria date={currentDate} eventos={eventos} configLaboral={configLaboral} currentUserId={usuario?.id} isMobile={isMobile} onSelectEvent={(e) => { setSelectedEvent(e); setModalOpen(true); }} onSelectDate={(d) => { setPrefillData(d); setModalOpen(true); }} onEliminar={handleEliminar} />}
      </div>

      {modalOpen && (() => {
        const eventoParaEditar = selectedEvent?.esOcurrencia
          ? { ...selectedEvent, id: selectedEvent.eventoBaseId }
          : selectedEvent;
        return (
          <ModalEvento 
            key={eventoParaEditar?.id || 'nuevo'}
            evento={eventoParaEditar} 
            prefill={prefillData}
            onClose={() => setModalOpen(false)} 
            onSave={() => { setModalOpen(false); cargarDatos(); }}
            onDelete={handleEliminar}
          />
        );
      })()}

      {modalConfigOpen && (
        <ModalConfiguracionAgenda 
          onClose={() => { setModalConfigOpen(false); cargarDatos(); }} 
          showToast={showToast} 
        />
      )}
    </div>
  );
};

// ── VISTAS (MENSUAL, SEMANAL, DIARIA) ────────────────────────────────────────

const VistaMensual = ({ date, eventos, diasEspeciales, configLaboral, currentUserId, isMobile, onSelectEvent, onSelectDate }) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const dias = [];
  for (let i = 0; i < startOffset; i++) dias.push(null);
  for (let i = 1; i <= totalDays; i++) dias.push(i);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', overflowX: isMobile ? 'auto' : 'hidden' }}>
      {DIAS_SEMANA.map(d => (
        <div key={d} style={{ padding: isMobile ? '0.5rem' : '1rem', textAlign: 'center', fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>{isMobile ? d.charAt(0).toUpperCase() : d.toUpperCase()}</div>
      ))}
      {dias.map((dia, i) => {
        const dObj = dia ? new Date(year, month, dia) : null;
        const diaEventos = dia ? eventos.filter(e => {
          const start = new Date(e.fechaInicio);
          const end = e.fechaFin ? new Date(e.fechaFin) : start;
          const current = new Date(year, month, dia);
          
          // Normalizar para comparar solo por fecha (sin horas)
          const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
          const ed = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
          const c = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
          
          return c >= s && c <= ed;
        }) : [];
        const diaEsp = dia ? diasEspeciales.find(e => new Date(e.fecha).getDate() === dia && new Date(e.fecha).getMonth() === month) : null;
        const esHoy = dia === new Date().getDate() && month === new Date().getMonth();

        const diaSemana = dObj ? (dObj.getDay() === 0 ? 7 : dObj.getDay()) : null;
        const esLaboral = configLaboral?.diasLaborales?.includes(diaSemana);
        const circleBg = esHoy ? 'var(--color-primary)' : (dia ? (esLaboral ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'transparent');
        const circleColor = esHoy ? '#fff' : (dia ? (esLaboral ? '#3b82f6' : '#ef4444') : 'var(--color-text)');

        return (
          <div key={i} onClick={() => dia && onSelectDate({ fechaInicio: dObj })} style={{ minHeight: isMobile ? '70px' : '120px', padding: '0.25rem', borderRight: '1px solid var(--color-border-light)', borderBottom: '1px solid var(--color-border-light)', position: 'relative', cursor: dia ? 'pointer' : 'default', background: dia && !esLaboral ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
            {dia && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  {diaEsp && (
                    <div 
                      style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: diaEsp.tipo === 'festivo' ? '#ef4444' : diaEsp.tipo === 'vacacion' ? '#10b981' : diaEsp.tipo === 'homeoffice' ? '#3b82f6' : '#f59e0b' 
                      }} 
                      title={diaEsp.descripcion} 
                    />
                  )}
                  <span style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem', fontWeight: '900', background: circleBg, color: circleColor }}>{dia}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {diaEventos.slice(0, 4).map(e => (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onSelectEvent(e); }} style={{ fontSize: '0.65rem', padding: '2px 4px', borderRadius: '3px', background: e.color, color: '#fff', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: e.usuarioId !== currentUserId ? '1px dashed rgba(255,255,255,0.8)' : 'none' }}>
                      {e.esGlobal ? <Globe size={8} style={{ marginRight: '2px' }} /> : e.esCompartido ? <Users size={8} style={{ marginRight: '2px' }} /> : null}{e.esOcurrencia ? '🔁 ' : ''}{e.titulo}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

const VistaSemanal = ({ date, eventos, configLaboral, currentUserId, onSelectEvent, onSelectDate }) => {
  const startOfWeek = useMemo(() => {
    const d = new Date(date);
    const day = d.getDay();
    return new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)));
  }, [date]);

  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hStart = 6;
  const hEnd = 18;
  const horas = getHoras(hStart, hEnd);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
        <div style={{ width: '60px', borderRight: '1px solid var(--color-border)' }} />
        {semana.map((d, i) => {
          const diaSemana = d.getDay() === 0 ? 7 : d.getDay();
          const esLaboral = configLaboral?.diasLaborales?.includes(diaSemana);
          const circleBg = d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() ? 'var(--color-primary)' : (esLaboral ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)');
          const circleColor = d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() ? '#fff' : (esLaboral ? '#3b82f6' : '#ef4444');

          return (
            <div key={i} style={{ flex: 1, padding: '1rem', textAlign: 'center', borderRight: i < 6 ? '1px solid var(--color-border-light)' : 'none', background: !esLaboral ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: circleColor }}>{DIAS_SEMANA[i].toUpperCase()}</div>
              <div style={{ width: '32px', height: '32px', margin: '0.4rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1.1rem', fontWeight: '900', background: circleBg, color: circleColor }}>
                {d.getDate()}
              </div>
              {!esLaboral && <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#ef4444' }}>NO LABORAL</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', maxHeight: '600px', overflowY: 'auto' }}>
        <div style={{ width: '60px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          {horas.map(h => <div key={h} style={{ height: '50px', padding: '0.5rem', fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-text-dim)', textAlign: 'right', borderBottom: '1px solid var(--color-border-light)' }}>{h}</div>)}
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          {semana.map((d, dayIdx) => {
             const diaSemana = d.getDay() === 0 ? 7 : d.getDay();
             const esLaboralDia = configLaboral?.diasLaborales?.includes(diaSemana);

             return (
              <div key={dayIdx} style={{ flex: 1, borderRight: dayIdx < 6 ? '1px solid var(--color-border-light)' : 'none', position: 'relative', background: !esLaboralDia ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                {horas.map(h => {
                  const hour = parseInt(h);
                  const isWork = configLaboral ? (hour >= parseInt(configLaboral.hora_entrada || '09') && hour < parseInt(configLaboral.hora_salida || '18')) : true;
                  const isLunch = configLaboral ? (hour >= parseInt(configLaboral.hora_comida_inicio || '14') && hour < parseInt(configLaboral.hora_comida_fin || '15')) : false;
                  return (
                    <div key={h} onClick={() => onSelectDate({ fechaInicio: new Date(new Date(d).setHours(hour)) })} style={{ height: '50px', borderBottom: '1px solid var(--color-border-light)', background: isLunch ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.02) 5px, rgba(0,0,0,0.02) 10px)' : (isWork || !esLaboralDia ? 'transparent' : 'rgba(0,0,0,0.03)'), cursor: 'pointer' }} />
                  );
                })}
                {eventos.filter(e => {
                  const start = new Date(e.fechaInicio);
                  const end = e.fechaFin ? new Date(e.fechaFin) : start;
                  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
                  const ed = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
                  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                  return c >= s && c <= ed && !e.todoElDia;
                }).map(e => {
                  const start = new Date(e.fechaInicio);
                  const end = e.fechaFin ? new Date(e.fechaFin) : new Date(start.getTime() + 3600000);
                  
                  // Calcular horas para este día específico
                  const isStartDay = start.getDate() === d.getDate() && start.getMonth() === d.getMonth();
                  const isEndDay = end.getDate() === d.getDate() && end.getMonth() === d.getMonth();
                  
                  const displayStart = isStartDay ? start.getHours() + start.getMinutes() / 60 : hStart;
                  const displayEnd = isEndDay ? end.getHours() + end.getMinutes() / 60 : hEnd + 1;
                  
                  // Omitir si el evento está totalmente fuera del rango visible
                  if (displayEnd <= hStart || displayStart >= hEnd + 1) return null;

                  const top = (Math.max(displayStart, hStart) - hStart) * 50;
                  const height = (Math.min(displayEnd, hEnd + 1) - Math.max(displayStart, hStart)) * 50;
                  const isInvited = e.usuarioId !== currentUserId;
                  return (
                    <div key={e.id} onClick={() => onSelectEvent(e)} style={{ position: 'absolute', top, height: Math.max(height, 20), left: '2px', right: '2px', background: e.color, borderRadius: '4px', padding: '4px', color: '#fff', fontSize: '0.65rem', fontWeight: '700', zIndex: 5, boxShadow: 'var(--shadow-sm)', opacity: isInvited ? 0.9 : 1, border: isInvited ? '2px dashed rgba(255,255,255,0.5)' : 'none', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {e.esGlobal ? <Globe size={10}/> : e.esCompartido ? <Users size={10}/> : null}{e.esOcurrencia ? '🔁 ' : ''}{e.titulo}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const VistaDiaria = ({ date, eventos, configLaboral, currentUserId, isMobile, onSelectEvent, onSelectDate, onEliminar }) => {
  const hStart = 6;
  const hEnd = 18;
  const horas = getHoras(hStart, hEnd);
  const evs = eventos.filter(e => {
    const start = new Date(e.fechaInicio);
    const end = e.fechaFin ? new Date(e.fechaFin) : start;
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const ed = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const c = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return c >= s && c <= ed;
  });
  const diaSemana = date.getDay() === 0 ? 7 : date.getDay();
  const esLaboral = configLaboral?.diasLaborales?.includes(diaSemana);
  const colorHeader = esLaboral ? 'var(--color-primary)' : '#ef4444';

  return (
    <div style={{ display: 'flex', height: '650px', flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ flex: 1, display: 'flex', overflowY: 'auto' }}>
        <div style={{ width: isMobile ? '50px' : '80px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          {horas.map(h => <div key={h} style={{ height: '80px', padding: '0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-text-dim)', textAlign: 'right', borderBottom: '1px solid var(--color-border-light)' }}>{h}</div>)}
        </div>
        <div style={{ flex: 1, position: 'relative', background: !esLaboral ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
          {horas.map(h => {
             const hour = parseInt(h);
             const isWork = configLaboral ? (hour >= parseInt(configLaboral.hora_entrada || '09') && hour < parseInt(configLaboral.hora_salida || '18')) : true;
             return <div key={h} onClick={() => onSelectDate({ fechaInicio: new Date(new Date(date).setHours(hour)) })} style={{ height: '80px', borderBottom: '1px solid var(--color-border-light)', background: isWork || !esLaboral ? 'transparent' : 'rgba(0,0,0,0.03)', cursor: 'pointer' }} />;
          })}
          {evs.filter(e => !e.todoElDia).map(e => {
            const start = new Date(e.fechaInicio);
            const end = e.fechaFin ? new Date(e.fechaFin) : new Date(start.getTime() + 3600000);
            
            // Calcular horas para este día específico
            const isStartDay = start.getDate() === date.getDate() && start.getMonth() === date.getMonth();
            const isEndDay = end.getDate() === date.getDate() && end.getMonth() === date.getMonth();
            
            const displayStart = isStartDay ? start.getHours() + start.getMinutes() / 60 : hStart;
            const displayEnd = isEndDay ? end.getHours() + end.getMinutes() / 60 : hEnd + 1;
            
            if (displayEnd <= hStart || displayStart >= hEnd + 1) return null;

            const top = (Math.max(displayStart, hStart) - hStart) * 80;
            const height = (Math.min(displayEnd, hEnd + 1) - Math.max(displayStart, hStart)) * 80;
            
            return (
              <div key={e.id} onClick={() => onSelectEvent(e)} style={{ position: 'absolute', top, height: Math.max(height, 40), left: '10px', right: '10px', background: e.color, borderRadius: '12px', padding: '1rem', color: '#fff', boxShadow: 'var(--shadow-lg)', zIndex: 10, cursor: 'pointer', border: e.usuarioId !== currentUserId ? '2px dashed rgba(255,255,255,0.4)' : 'none' }}>
                <div style={{ fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {e.esGlobal ? <Globe size={14}/> : e.esCompartido ? <Users size={14}/> : null}{e.esOcurrencia ? '🔁 ' : ''}{e.titulo}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ width: isMobile ? '100%' : '350px', background: 'var(--color-surface-2)', padding: '1.5rem', borderLeft: isMobile ? 'none' : '1px solid var(--color-border)', borderTop: isMobile ? '1px solid var(--color-border)' : 'none', overflowY: 'auto' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
           <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: colorHeader, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '900' }}>
             {date.getDate()}
           </div>
           <div>
             <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>{formatFechaLarga(date)}</div>
             <div style={{ fontSize: '0.7rem', color: colorHeader, fontWeight: '800' }}>{esLaboral ? 'DÍA LABORAL' : 'DÍA DE DESCANSO'}</div>
           </div>
         </div>
         <h3 style={{ fontWeight: '900', fontSize: '0.85rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Eventos programados</h3>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           {evs.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>No hay eventos para hoy</div>
           ) : (
             evs.sort((a,b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)).map(e => (
               <div key={e.id} style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '1.25rem', borderLeft: `5px solid ${e.color}`, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '800' }}>{e.esOcurrencia ? '🔁 ' : ''}{e.titulo}</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => onSelectEvent(e)} className="btn-icon-sm"><Edit2 size={12}/></button>
                      <button onClick={() => onEliminar(e.id)} className="btn-icon-sm" style={{ color: 'var(--color-error)' }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                   {e.esGlobal ? (
                     <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12}/> EVENTO GLOBAL</div>
                   ) : e.esCompartido ? (
                     <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12}/> EVENTO COMPARTIDO</div>
                   ) : null}
                  {e.usuarioId !== currentUserId && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Organizado por: <b>{e.creador?.nombre}</b></div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {new Date(e.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
               </div>
             ))
           )}
         </div>
      </div>
    </div>
  );
};

export default AgendaPage;
