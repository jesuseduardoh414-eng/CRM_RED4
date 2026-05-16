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
  Globe,
  Activity,
  CheckSquare,
  Repeat,
} from 'lucide-react';
import { agendaService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ModalEvento from '../components/ModalEvento';
import ModalConfiguracionAgenda from '../components/ModalConfiguracionAgenda';

const VISTAS = [
  { id: 'MES', label: 'Mes', icon: <LayoutGrid size={16} /> },
  { id: 'SEMANA', label: 'Semana', icon: <Columns size={16} /> },
  { id: 'DIA', label: 'Día', icon: <List size={16} /> },
];

const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const LABORALES_DEFAULT = [1, 2, 3, 4, 5];
const TIPOS_NO_LABORALES = ['festivo', 'vacacion', 'permiso'];
const COLOR_TAREA = '#16a34a';

const formatFechaLarga = (date) =>
  date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', day: 'numeric' });

const formatMesAnio = (date) =>
  date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

const formatHora = (value) =>
  new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const inicioDelDia = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const finDelDia = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getHoras = (start, end) => {
  const horas = [];
  for (let i = start; i <= end; i += 1) horas.push(`${String(i).padStart(2, '0')}:00`);
  return horas;
};

const normalizarConfigLaboral = (config) => ({
  diasLaborales: config?.diasLaborales || config?.dias_laborales || LABORALES_DEFAULT,
  horaEntrada: config?.horaEntrada || config?.hora_entrada || '09:00',
  horaSalida: config?.horaSalida || config?.hora_salida || '18:00',
  horaComidaInicio: config?.horaComidaInicio || config?.hora_comida_inicio || '14:00',
  horaComidaFin: config?.horaComidaFin || config?.hora_comida_fin || '15:00',
});

const getDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDiaEspecialKey = (dia) =>
  typeof dia?.fecha === 'string' ? dia.fecha.split('T')[0] : getDateKey(dia?.fecha);

const getDiaEspecial = (date, diasEspeciales = []) => {
  const dateKey = getDateKey(date);
  return diasEspeciales.find((dia) => getDiaEspecialKey(dia) === dateKey);
};

const getDiaSemanaLaboral = (date) => (date.getDay() === 0 ? 7 : date.getDay());

const getEstadoLaboral = (date, configLaboral, diasEspeciales = []) => {
  const diaSemana = getDiaSemanaLaboral(date);
  const diasLaborales = configLaboral?.diasLaborales || LABORALES_DEFAULT;
  const diaEspecial = getDiaEspecial(date, diasEspeciales);
  const esDiaEspecialNoLaboral = diaEspecial && TIPOS_NO_LABORALES.includes(diaEspecial.tipo);

  return {
    diaEspecial,
    esLaboral: diasLaborales.includes(diaSemana) && !esDiaEspecialNoLaboral,
    esDiaEspecialNoLaboral,
  };
};

const aFechaComparacion = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
};

const eventoOcurreEnFecha = (evento, date) => {
  const inicio = aFechaComparacion(evento.fechaInicio);
  const fin = aFechaComparacion(evento.fechaFin || evento.fechaInicio);
  const objetivo = aFechaComparacion(date);
  if (!inicio || !fin || !objetivo) return false;
  return objetivo.getTime() >= inicio.getTime() && objetivo.getTime() <= fin.getTime();
};

const esBloqueProyecto = (evento) =>
  typeof evento?.titulo === 'string' &&
  evento.titulo.trim().startsWith('Proyecto:');

const tareaOcurreEnFecha = (tarea, date, configLaboral, diasEspeciales) => {
  if (!eventoOcurreEnFecha(tarea, date)) return false;

  const fin = aFechaComparacion(tarea.fechaFin || tarea.fechaInicio);
  const objetivo = aFechaComparacion(date);
  if (!fin || !objetivo) return false;
  if (getDateKey(fin) === getDateKey(objetivo)) return true;

  return getEstadoLaboral(objetivo, configLaboral, diasEspeciales).esLaboral;
};

const itemAgendaOcurreEnFecha = (evento, date, configLaboral, diasEspeciales) =>
  evento?.tipo === 'tarea'
    ? tareaOcurreEnFecha(evento, date, configLaboral, diasEspeciales)
    : eventoOcurreEnFecha(evento, date);

const restarIntervalos = (base, ocupados) => {
  let libres = [...base];
  ocupados.forEach((ocupado) => {
    libres = libres.flatMap((libre) => {
      if (ocupado.end <= libre.start || ocupado.start >= libre.end) return [libre];
      const partes = [];
      if (ocupado.start > libre.start) partes.push({ start: libre.start, end: ocupado.start });
      if (ocupado.end < libre.end) partes.push({ start: ocupado.end, end: libre.end });
      return partes;
    });
  });
  return libres.filter((libre) => libre.end - libre.start >= 8);
};

const distribuirEnHuecos = (items, huecos, altoTotal) => {
  if (!items.length) return new Map();

  const segmentos = huecos.length ? huecos : [{ start: 0, end: altoTotal }];
  const totalLibre = segmentos.reduce((acc, seg) => acc + (seg.end - seg.start), 0);
  const slot = totalLibre / items.length;
  const height = Math.max(8, Math.min(30, slot - 3));
  const posiciones = new Map();

  items.forEach((item, index) => {
    const objetivo = index * slot + 1.5;
    let acumulado = 0;
    let elegido = segmentos[segmentos.length - 1];
    let offset = 0;

    for (const segmento of segmentos) {
      const largo = segmento.end - segmento.start;
      if (objetivo <= acumulado + largo) {
        elegido = segmento;
        offset = objetivo - acumulado;
        break;
      }
      acumulado += largo;
    }

    const top = Math.min(elegido.start + offset, elegido.end - height);
    posiciones.set(item.id, { top: Math.max(elegido.start, top), height });
  });

  return posiciones;
};

const getRangoConsulta = (date, view) => {
  if (view === 'DIA') {
    return { inicio: inicioDelDia(date), fin: finDelDia(date) };
  }

  if (view === 'SEMANA') {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
    return {
      inicio: inicioDelDia(start),
      fin: finDelDia(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
    };
  }

  return {
    inicio: inicioDelDia(new Date(date.getFullYear(), date.getMonth(), 1)),
    fin: finDelDia(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
};

const getHoraInicial = () => 0;
const getHoraFinal = () => 23;

const AgendaPage = () => {
  const { showToast } = useToast();
  const { usuario } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('MES');
  const [eventos, setEventos] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [configLaboral, setConfigLaboral] = useState(normalizarConfigLaboral(null));
  const [diasEspeciales, setDiasEspeciales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [showInvitaciones, setShowInvitaciones] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const ocultarBloquesProyecto = usuario?.rol === 'ADMIN';
  const eventosVisibles = useMemo(
    () => (ocultarBloquesProyecto ? eventos.filter((evento) => !esBloqueProyecto(evento)) : eventos),
    [eventos, ocultarBloquesProyecto]
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const mes = currentDate.getMonth() + 1;
      const anio = currentDate.getFullYear();
      const rango = getRangoConsulta(currentDate, view);

      const [resEventos, resInvitaciones, resConfig, resDias] = await Promise.all([
        agendaService.listar(rango.inicio.toISOString(), rango.fin.toISOString()),
        agendaService.invitacionesPendientes(),
        agendaService.getConfigLaboral(),
        agendaService.listarDiasEspeciales(mes, anio),
      ]);

      setEventos(resEventos.eventos || []);
      setInvitaciones(resInvitaciones.invitaciones || resInvitaciones.pendientes || []);
      setConfigLaboral(normalizarConfigLaboral(resConfig.config));
      setDiasEspeciales(resDias.dias || []);
    } catch (error) {
      showToast(error.message || 'Error al cargar la agenda', 'error');
    } finally {
      setCargando(false);
    }
  }, [currentDate, showToast, view]);

  useEffect(() => {
    cargarDatos();
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
    hoy: () => setCurrentDate(new Date()),
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

  const handleSelectFechaEvento = (datosFecha) => {
    setSelectedEvent(null);
    setPrefillData(datosFecha);
    setModalOpen(true);
  };

  const handleSelectFechaMes = (datosFecha) => {
    setCurrentDate(new Date(datosFecha.fechaInicio));
    setView('DIA');
  };

  if (cargando && !eventos.length) return <AgendaSkeleton />;

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '2rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', letterSpacing: '-0.03em', margin: 0 }}>
            {view === 'MES' ? formatMesAnio(currentDate).toUpperCase() : formatFechaLarga(currentDate)}
          </h1>
          <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button onClick={nav.prev} className="btn-icon-sm" style={{ width: '28px', height: '28px' }}><ChevronLeft size={16} /></button>
              <button
                onClick={nav.hoy}
                style={{ padding: '0 0.8rem', fontSize: '0.7rem', fontWeight: '800', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
              >
                HOY
              </button>
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
            {VISTAS.map((vista) => (
              <button
                key={vista.id}
                onClick={() => setView(vista.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: view === vista.id ? 'var(--color-primary)' : 'transparent',
                  color: view === vista.id ? '#ffffff' : 'var(--color-text-muted)',
                }}
              >
                {vista.icon} {!isMobile && vista.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedEvent(null);
              setPrefillData(null);
              setModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={18} /> {!isMobile && 'Nuevo evento'}
          </button>
        </div>
      </div>

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
              invitaciones.map((inv) => (
                <div key={inv.id} style={{ padding: '1.25rem', background: 'var(--color-surface-2)', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: '800', marginBottom: '0.25rem' }}>{inv.evento.titulo}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                    Organiza: <b>{inv.evento.creador?.nombre}</b><br />
                    {new Date(inv.evento.fechaInicio).toLocaleString('es-MX')}
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

      <div className="card" style={{ padding: '0', borderRadius: isMobile ? '1rem' : '2rem', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-xl)' }}>
        {view === 'MES' && (
          <VistaMensual
            date={currentDate}
            eventos={eventosVisibles}
            diasEspeciales={diasEspeciales}
            configLaboral={configLaboral}
            currentUserId={usuario?.id}
            isMobile={isMobile}
            ocultarBloquesProyecto={ocultarBloquesProyecto}
            onSelectEvent={(e) => {
              if (e.esLectura) return showToast(e.titulo, 'info');
              setSelectedEvent(e);
              setModalOpen(true);
            }}
            onSelectDate={handleSelectFechaMes}
          />
        )}
        {view === 'SEMANA' && (
          <VistaSemanal
            date={currentDate}
            eventos={eventosVisibles}
            diasEspeciales={diasEspeciales}
            configLaboral={configLaboral}
            currentUserId={usuario?.id}
            isMobile={isMobile}
            ocultarBloquesProyecto={ocultarBloquesProyecto}
            onSelectEvent={(e) => {
              if (e.esLectura) return showToast(e.titulo, 'info');
              setSelectedEvent(e);
              setModalOpen(true);
            }}
            onSelectDate={handleSelectFechaEvento}
          />
        )}
        {view === 'DIA' && (
          <VistaDiaria
            date={currentDate}
            eventos={eventosVisibles}
            diasEspeciales={diasEspeciales}
            configLaboral={configLaboral}
            currentUserId={usuario?.id}
            isMobile={isMobile}
            ocultarBloquesProyecto={ocultarBloquesProyecto}
            onSelectEvent={(e) => {
              if (e.esLectura) return showToast(e.titulo, 'info');
              setSelectedEvent(e);
              setModalOpen(true);
            }}
            onSelectDate={handleSelectFechaEvento}
            onEliminar={handleEliminar}
          />
        )}
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
            onSave={() => {
              setModalOpen(false);
              cargarDatos();
            }}
            onDelete={handleEliminar}
          />
        );
      })()}

      {modalConfigOpen && (
        <ModalConfiguracionAgenda
          onClose={() => {
            setModalConfigOpen(false);
            cargarDatos();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};

const AgendaSkeleton = () => (
  <div className="page-container" style={{ padding: '2rem' }}>
    <div className="animate-pulse" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
      <div>
        <div style={{ width: '280px', height: '40px', borderRadius: '10px', background: '#e2e8f0', marginBottom: '0.75rem' }} />
        <div style={{ width: '180px', height: '18px', borderRadius: '8px', background: '#edf2f7' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e2e8f0' }} />
        <div style={{ width: '180px', height: '44px', borderRadius: '12px', background: '#e2e8f0' }} />
      </div>
    </div>

    <div className="card animate-pulse" style={{ padding: 0, borderRadius: '2rem', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-xl)' }}>
      <div className="grid grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`head-${i}`} style={{ height: '58px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', borderRight: i < 6 ? '1px solid #f1f5f9' : 'none' }} />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ minHeight: '120px', padding: '0.75rem', background: '#fff', borderRight: (i + 1) % 7 ? '1px solid #f8fafc' : 'none', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e2e8f0', marginBottom: '1.5rem' }} />
            <div style={{ width: '70%', height: '10px', borderRadius: '999px', background: '#edf2f7', marginBottom: '0.5rem' }} />
            <div style={{ width: '46%', height: '10px', borderRadius: '999px', background: '#f1f5f9' }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const VistaMensual = ({ date, eventos, diasEspeciales, configLaboral, isMobile, onSelectEvent, onSelectDate, ocultarBloquesProyecto = false }) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const dias = [];
  for (let i = 0; i < startOffset; i += 1) dias.push(null);
  for (let i = 1; i <= totalDays; i += 1) dias.push(i);

  return (
    <div className="grid grid-cols-7 border-t border-slate-100">
      {DIAS_SEMANA.map((diaSemana) => (
        <div key={diaSemana} className="p-3 lg:p-4 text-center text-[10px] font-black text-slate-400 border-b border-slate-100 bg-slate-50 uppercase tracking-widest">
          {isMobile ? diaSemana.charAt(0) : diaSemana}
        </div>
      ))}

      {dias.map((dia, i) => {
        const dObj = dia ? new Date(year, month, dia) : null;
        const diaEventos = dia ? eventos.filter((evento) => itemAgendaOcurreEnFecha(evento, dObj, configLaboral, diasEspeciales) && !esBloqueProyecto(evento)) : [];
        const diaTareas = diaEventos.filter((evento) => evento.tipo === 'tarea');
        const diaEventosVisibles = diaEventos.filter((evento) => evento.tipo !== 'tarea');
        const eventosMostrados = diaEventosVisibles.slice(0, diaTareas.length ? 1 : 2);
        const eventosOcultos = Math.max(diaEventosVisibles.length - eventosMostrados.length, 0);
        const diaProyectos = dia && !ocultarBloquesProyecto
          ? eventos.filter((evento) => itemAgendaOcurreEnFecha(evento, dObj, configLaboral, diasEspeciales) && esBloqueProyecto(evento))
          : [];
        const diaEsp = dia ? getDiaEspecial(dObj, diasEspeciales) : null;
        const esHoy = dia === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
        const { esLaboral } = dObj ? getEstadoLaboral(dObj, configLaboral, diasEspeciales) : { esLaboral: false };
        const circleBg = esHoy ? 'bg-blue-600' : '';
        const circleColor = esHoy ? 'text-white' : dia ? (esLaboral ? 'text-slate-600' : 'text-red-400') : 'text-slate-300';
        const projectBg = diaProyectos.length ? 'rgba(37, 99, 235, 0.055)' : null;

        return (
          <div
            key={i}
            onClick={() => dia && onSelectDate({ fechaInicio: dObj })}
            className={`
              min-h-[70px] lg:min-h-[120px] p-1.5 lg:p-2 border-r border-b border-slate-50 relative cursor-pointer transition-colors
              ${dia ? 'hover:bg-blue-50/30' : 'bg-slate-50/30'}
            `}
            style={{
              background: dia
                ? projectBg || (!esLaboral ? 'rgba(248, 250, 252, 0.8)' : '#fff')
                : 'rgba(248, 250, 252, 0.3)',
              boxShadow: diaProyectos.length ? 'inset 0 0 0 1px rgba(37, 99, 235, 0.08)' : undefined,
            }}
          >
            {dia && (
              <>
                <div className="flex justify-between items-start mb-1">
                  <span className={`
                    w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded-lg text-[10px] lg:text-xs font-black transition-all
                    ${circleBg} ${circleColor}
                    ${esHoy ? 'shadow-lg shadow-blue-500/30' : ''}
                  `}>
                    {dia}
                  </span>
                  {diaEsp && (
                    <div
                      className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full mt-1.5 mr-0.5"
                      style={{
                        background: diaEsp.tipo === 'festivo' ? '#ef4444' : diaEsp.tipo === 'vacacion' ? '#10b981' : diaEsp.tipo === 'homeoffice' ? '#3b82f6' : '#f59e0b',
                      }}
                      title={diaEsp.descripcion}
                    />
                  )}
                </div>

                {diaEsp && (
                  <div style={{ fontSize: '0.65rem', fontWeight: '800', color: diaEsp.tipo === 'festivo' ? '#ef4444' : '#6366f1', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {diaEsp.descripcion}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {(() => {
                    const todosLosItems = [
                      ...diaProyectos.map(p => ({
                        id: p.id,
                        text: (p.titulo || '').replace('Proyecto: ', ''),
                        color: '#2563eb',
                        bg: 'rgba(37,99,235,0.08)',
                        type: 'proyecto',
                        raw: p
                      })),
                      ...(diaTareas.length > 0 ? [{
                        id: 'tareas-group',
                        text: `${diaTareas.length} Tarea${diaTareas.length > 1 ? 's' : ''}`,
                        color: '#16a34a',
                        bg: 'rgba(22,163,74,0.08)',
                        type: 'tarea-group',
                        raw: null
                      }] : []),
                      ...diaEventosVisibles.map(e => ({
                        id: e.id,
                        text: e.titulo,
                        color: e.color || '#8b5cf6',
                        bg: e.color ? `${e.color}15` : 'rgba(139,92,246,0.08)',
                        type: e.tipo,
                        raw: e
                      }))
                    ];

                    const MAX_ITEMS = 3;
                    const itemsMostrados = todosLosItems.slice(0, MAX_ITEMS);
                    const ocultos = todosLosItems.length - itemsMostrados.length;

                    return (
                      <>
                        {itemsMostrados.map(item => (
                          <div
                            key={item.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (item.type === 'tarea-group') {
                                onSelectDate({ fechaInicio: dObj });
                              } else {
                                onSelectEvent(item.raw);
                              }
                            }}
                            style={{ 
                              padding: '0.25rem 0.4rem', 
                              borderRadius: '6px', 
                              background: item.bg, 
                              color: item.color, 
                              fontSize: '0.55rem', 
                              fontWeight: '900',
                              borderLeft: `2px solid ${item.color}`,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer'
                            }}
                            title={item.text}
                          >
                            {item.text}
                          </div>
                        ))}

                        {ocultos > 0 && (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onSelectDate({ fechaInicio: dObj });
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              fontSize: '0.6rem',
                              color: 'var(--color-primary)',
                              fontWeight: '900',
                              padding: '0 0 0 4px',
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            +{ocultos} m&aacute;s
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

const VistaSemanal = ({ date, eventos, diasEspeciales, configLaboral, currentUserId, onSelectEvent, onSelectDate, ocultarBloquesProyecto = false }) => {
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

  const hStart = getHoraInicial(configLaboral);
  const hEnd = getHoraFinal(configLaboral);
  const horas = getHoras(hStart, hEnd);
  const eventosTodoElDiaPorDia = semana.map((d) => eventos.filter((e) => itemAgendaOcurreEnFecha(e, d, configLaboral, diasEspeciales) && e.todoElDia && e.tipo !== 'tarea' && !esBloqueProyecto(e)));
  const tareasPorDia = semana.map((d) => eventos.filter((e) => e.tipo === 'tarea' && itemAgendaOcurreEnFecha(e, d, configLaboral, diasEspeciales)));
  const proyectosPorDia = semana.map((d) => (
    ocultarBloquesProyecto
      ? []
      : eventos.filter((e) => itemAgendaOcurreEnFecha(e, d, configLaboral, diasEspeciales) && esBloqueProyecto(e))
  ));
  const altoGrid = horas.length * 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
        <div style={{ width: '60px', borderRight: '1px solid var(--color-border)' }} />
        {semana.map((d, i) => {
          const { esLaboral, diaEspecial } = getEstadoLaboral(d, configLaboral, diasEspeciales);
          const esHoy = d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
          const tieneProyecto = proyectosPorDia[i].length > 0;
          const circleBg = esHoy ? 'var(--color-primary)' : esLaboral ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
          const circleColor = esHoy ? '#fff' : esLaboral ? '#3b82f6' : '#ef4444';
          const labelColor = esHoy ? '#1d4ed8' : circleColor;
          const headerBg = esHoy
            ? 'rgba(37, 99, 235, 0.14)'
            : tieneProyecto
              ? 'rgba(37,99,235,0.055)'
              : !esLaboral
                ? 'rgba(239, 68, 68, 0.02)'
                : 'transparent';

          return (
            <div key={i} style={{ flex: 1, padding: '1rem', textAlign: 'center', borderRight: i < 6 ? '1px solid var(--color-border-light)' : 'none', background: headerBg, boxShadow: esHoy ? 'inset 0 -2px 0 rgba(37,99,235,0.35)' : 'none' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: labelColor }}>{DIAS_SEMANA[i].toUpperCase()}</div>
              <div style={{ width: '32px', height: '32px', margin: '0.4rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1.1rem', fontWeight: '900', background: circleBg, color: circleColor }}>
                {d.getDate()}
              </div>
              {!esLaboral && <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#ef4444' }}>{diaEspecial?.descripcion || 'NO LABORAL'}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface)' }}>
        <div style={{ width: '60px', borderRight: '1px solid var(--color-border)' }} />
        {semana.map((_, dayIdx) => (
          <div key={`all-day-${dayIdx}`} style={{ flex: 1, minHeight: '56px', padding: '0.5rem', borderRight: dayIdx < 6 ? '1px solid var(--color-border-light)' : 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {eventosTodoElDiaPorDia[dayIdx].slice(0, 2).map((evento) => (
              <div
                key={evento.id}
                onClick={() => onSelectEvent(evento)}
                style={{ fontSize: '0.68rem', fontWeight: '800', color: '#fff', background: evento.color, borderRadius: '8px', padding: '0.25rem 0.4rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {evento.titulo}
              </div>
            ))}
            {eventosTodoElDiaPorDia[dayIdx].length > 2 && (
              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                + {eventosTodoElDiaPorDia[dayIdx].length - 2} más
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', maxHeight: '600px', overflowY: 'auto' }}>
        <div style={{ width: '60px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          {horas.map((h) => (
            <div key={h} style={{ height: '50px', padding: '0.5rem', fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-text-dim)', textAlign: 'right', borderBottom: '1px solid var(--color-border-light)' }}>
              {h}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          {semana.map((d, dayIdx) => {
            const { esLaboral: esLaboralDia } = getEstadoLaboral(d, configLaboral, diasEspeciales);
            const esHoyDia = getDateKey(d) === getDateKey(new Date());
            const eventosConHora = eventos
              .filter((evento) => itemAgendaOcurreEnFecha(evento, d, configLaboral, diasEspeciales) && !evento.todoElDia && evento.tipo !== 'tarea' && !esBloqueProyecto(evento))
              .map((evento) => {
                const start = new Date(evento.fechaInicio);
                const end = evento.fechaFin ? new Date(evento.fechaFin) : new Date(start.getTime() + 3600000);
                const isStartDay = getDateKey(start) === getDateKey(d);
                const isEndDay = getDateKey(end) === getDateKey(d);
                const displayStart = isStartDay ? start.getHours() + start.getMinutes() / 60 : hStart;
                const displayEnd = isEndDay ? end.getHours() + end.getMinutes() / 60 : hEnd + 1;
                if (displayEnd <= hStart || displayStart >= hEnd + 1) return null;
                const top = (Math.max(displayStart, hStart) - hStart) * 50;
                const height = (Math.min(displayEnd, hEnd + 1) - Math.max(displayStart, hStart)) * 50;
                return { evento, top, height: Math.max(height, 20) };
              })
              .filter(Boolean);
            const huecosTareas = restarIntervalos(
              [{ start: 0, end: altoGrid }],
              eventosConHora.map(({ top, height }) => ({ start: Math.max(0, top - 4), end: Math.min(altoGrid, top + height + 4) }))
            );
            const posicionesTareas = distribuirEnHuecos(tareasPorDia[dayIdx], huecosTareas, altoGrid);
            const bgDia = esHoyDia
              ? 'rgba(37,99,235,0.08)'
              : proyectosPorDia[dayIdx].length
                ? 'rgba(37,99,235,0.055)'
                : !esLaboralDia
                  ? 'rgba(239, 68, 68, 0.03)'
                  : 'transparent';
            return (
              <div key={dayIdx} style={{ flex: 1, borderRight: dayIdx < 6 ? '1px solid var(--color-border-light)' : 'none', position: 'relative', background: bgDia }}>
                {horas.map((h) => {
                  const hour = parseInt(h, 10);
                  const isWork = configLaboral ? hour >= parseInt(configLaboral.horaEntrada, 10) && hour < parseInt(configLaboral.horaSalida, 10) : true;
                  const isLunch = configLaboral ? hour >= parseInt(configLaboral.horaComidaInicio, 10) && hour < parseInt(configLaboral.horaComidaFin, 10) : false;
                  const slotBg = isLunch ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.02) 5px, rgba(0,0,0,0.02) 10px)' : isWork || !esLaboralDia ? 'transparent' : 'rgba(0,0,0,0.03)';
                  return (
                    <div
                      key={h}
                      onClick={() => onSelectDate({ fechaInicio: new Date(new Date(d).setHours(hour)) })}
                      onMouseEnter={(ev) => { ev.currentTarget.style.background = esHoyDia ? 'rgba(37,99,235,0.16)' : 'rgba(37,99,235,0.08)'; }}
                      onMouseLeave={(ev) => { ev.currentTarget.style.background = slotBg; }}
                      style={{ height: '50px', borderBottom: '1px solid var(--color-border-light)', background: slotBg, cursor: 'pointer' }}
                    />
                  );
                })}

                {tareasPorDia[dayIdx].map((tarea) => {
                  const { top, height } = posicionesTareas.get(tarea.id) || { top: 0, height: 12 };

                  return (
                    <div
                      key={tarea.id}
                      onClick={() => onSelectEvent(tarea)}
                      title={tarea.titulo}
                      style={{
                        position: 'absolute',
                        top,
                        height,
                        left: '6px',
                        right: '6px',
                        background: tarea.color,
                        borderRadius: '7px',
                        padding: height < 18 ? '1px 4px' : '3px 6px',
                        color: '#fff',
                        fontSize: height < 18 ? '0.55rem' : '0.62rem',
                        fontWeight: 800,
                        zIndex: 4,
                        boxShadow: '0 6px 12px rgba(22,163,74,0.18)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckSquare size={height < 18 ? 8 : 10} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tarea.titulo.replace(/^TAREA:\s*/i, '')}</span>
                    </div>
                  );
                })}

                {eventosConHora
                  .map(({ evento, top, height }) => {
                    const isInvited = evento.usuarioId !== currentUserId;

                    return (
                      <div
                        key={evento.id}
                        onClick={() => onSelectEvent(evento)}
                        style={{ position: 'absolute', top, height: Math.max(height, 20), left: '2px', right: '2px', background: evento.color, borderRadius: '4px', padding: '4px', color: '#fff', fontSize: '0.65rem', fontWeight: '700', zIndex: 5, boxShadow: 'var(--shadow-sm)', opacity: isInvited ? 0.9 : 1, border: isInvited ? '2px dashed rgba(255,255,255,0.5)' : 'none', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                      >
                        {evento.tipo === 'reunion' ? <Users size={10} /> : evento.tipo === 'actividad' ? <Activity size={10} /> : evento.tipo === 'tarea' ? <CheckSquare size={10} /> : evento.esGlobal ? <Globe size={10} /> : evento.esCompartido ? <Users size={10} /> : null}
                        {evento.esOcurrencia ? <Repeat size={10} /> : null}
                        {evento.titulo}
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

const VistaDiaria = ({ date, eventos, diasEspeciales, configLaboral, currentUserId, isMobile, onSelectEvent, onSelectDate, onEliminar, ocultarBloquesProyecto = false }) => {
  const hStart = getHoraInicial(configLaboral);
  const hEnd = getHoraFinal(configLaboral);
  const horas = getHoras(hStart, hEnd);
  const proyectosDelDia = ocultarBloquesProyecto
    ? []
    : eventos.filter((evento) => itemAgendaOcurreEnFecha(evento, date, configLaboral, diasEspeciales) && esBloqueProyecto(evento));
  const evs = eventos.filter((evento) => itemAgendaOcurreEnFecha(evento, date, configLaboral, diasEspeciales) && !esBloqueProyecto(evento));
  const evsTodoElDia = evs.filter((evento) => evento.todoElDia);
  const evsConHora = evs.filter((evento) => !evento.todoElDia);
  const tareasDelDia = evs.filter((evento) => evento.tipo === 'tarea');
  const eventosConHora = evsConHora
    .filter((evento) => evento.tipo !== 'tarea')
    .map((evento) => {
      const start = new Date(evento.fechaInicio);
      const end = evento.fechaFin ? new Date(evento.fechaFin) : new Date(start.getTime() + 3600000);
      const isStartDay = getDateKey(start) === getDateKey(date);
      const isEndDay = getDateKey(end) === getDateKey(date);
      const displayStart = isStartDay ? start.getHours() + start.getMinutes() / 60 : hStart;
      const displayEnd = isEndDay ? end.getHours() + end.getMinutes() / 60 : hEnd + 1;
      if (displayEnd <= hStart || displayStart >= hEnd + 1) return null;
      const top = (Math.max(displayStart, hStart) - hStart) * 80;
      const height = (Math.min(displayEnd, hEnd + 1) - Math.max(displayStart, hStart)) * 80;
      return { evento, top, height: Math.max(height, 40), start, end };
    })
    .filter(Boolean);
  const altoGrid = horas.length * 80;
  const huecosTareas = restarIntervalos(
    [{ start: 0, end: altoGrid }],
    eventosConHora.map(({ top, height }) => ({ start: Math.max(0, top - 8), end: Math.min(altoGrid, top + height + 8) }))
  );
  const posicionesTareas = distribuirEnHuecos(tareasDelDia, huecosTareas, altoGrid);
  const { esLaboral, diaEspecial } = getEstadoLaboral(date, configLaboral, diasEspeciales);
  const colorHeader = esLaboral ? 'var(--color-primary)' : '#ef4444';

  return (
    <div style={{ display: 'flex', height: '650px', flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ flex: 1, display: 'flex', overflowY: 'auto' }}>
        <div style={{ width: isMobile ? '50px' : '80px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          {horas.map((h) => (
            <div key={h} style={{ height: '80px', padding: '0.5rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-text-dim)', textAlign: 'right', borderBottom: '1px solid var(--color-border-light)' }}>
              {h}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative', background: proyectosDelDia.length ? 'rgba(37,99,235,0.055)' : !esLaboral ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
          {horas.map((h) => {
            const hour = parseInt(h, 10);
            const isWork = configLaboral ? hour >= parseInt(configLaboral.horaEntrada, 10) && hour < parseInt(configLaboral.horaSalida, 10) : true;
            return (
              <div
                key={h}
                onClick={() => onSelectDate({ fechaInicio: new Date(new Date(date).setHours(hour)) })}
                style={{ height: '80px', borderBottom: '1px solid var(--color-border-light)', background: isWork || !esLaboral ? 'transparent' : 'rgba(0,0,0,0.03)', cursor: 'pointer' }}
              />
            );
          })}

          {tareasDelDia.map((tarea) => {
            const { top, height } = posicionesTareas.get(tarea.id) || { top: 0, height: 18 };

            return (
              <div
                key={tarea.id}
                onClick={() => onSelectEvent(tarea)}
                title={tarea.titulo}
                style={{
                  position: 'absolute',
                  top,
                  height,
                  left: '14px',
                  right: '14px',
                  background: tarea.color,
                  borderRadius: '10px',
                  padding: height < 22 ? '2px 8px' : '6px 10px',
                  color: '#fff',
                  fontSize: height < 22 ? '0.62rem' : '0.78rem',
                  fontWeight: 800,
                  zIndex: 5,
                  boxShadow: '0 8px 16px rgba(22,163,74,0.18)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <CheckSquare size={height < 22 ? 10 : 13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tarea.titulo.replace(/^TAREA:\s*/i, '')}</span>
              </div>
            );
          })}

          {eventosConHora.map(({ evento, top, height, start, end }) => {
            return (
              <div
                key={evento.id}
                onClick={() => onSelectEvent(evento)}
                style={{ position: 'absolute', top, height, left: '10px', right: '10px', background: evento.color, borderRadius: '12px', padding: '1rem', color: '#fff', boxShadow: 'var(--shadow-lg)', zIndex: 10, cursor: 'pointer', border: evento.usuarioId !== currentUserId ? '2px dashed rgba(255,255,255,0.4)' : 'none' }}
              >
                <div style={{ fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {evento.tipo === 'reunion' ? <Users size={14} /> : evento.tipo === 'actividad' ? <Activity size={14} /> : evento.tipo === 'tarea' ? <CheckSquare size={14} /> : evento.esGlobal ? <Globe size={14} /> : evento.esCompartido ? <Users size={14} /> : null}
                  {evento.esOcurrencia ? <Repeat size={10} /> : null}
                  {evento.titulo}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {formatHora(start)} - {formatHora(end)}
                </div>
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
            <div style={{ fontSize: '0.7rem', color: colorHeader, fontWeight: '800' }}>
              {esLaboral ? 'DÍA LABORAL' : diaEspecial?.descripcion || 'DÍA DE DESCANSO'}
            </div>
          </div>
        </div>

        <h3 style={{ fontWeight: '900', fontSize: '0.85rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Agenda del día
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {evs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>No hay eventos para hoy</div>
          ) : (
            [...evsTodoElDia, ...evsConHora]
              .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
              .map((evento) => (
                <div key={evento.id} style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '1.25rem', borderLeft: `5px solid ${evento.color}`, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {evento.tipo === 'reunion' ? <Users size={14} color="var(--color-primary)" /> : evento.tipo === 'actividad' ? <Activity size={14} color="var(--color-primary)" /> : evento.tipo === 'tarea' ? <CheckSquare size={14} color="var(--color-primary)" /> : null}
                      {evento.esOcurrencia ? <Repeat size={10} /> : null}
                      {evento.titulo}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!evento.esLectura && (
                        <>
                          <button onClick={() => onSelectEvent(evento)} className="btn-icon-sm"><Edit2 size={12} /></button>
                          <button onClick={() => onEliminar(evento.id)} className="btn-icon-sm" style={{ color: 'var(--color-error)' }}><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {evento.esGlobal ? (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> EVENTO GLOBAL</div>
                  ) : evento.esCompartido ? (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> EVENTO COMPARTIDO</div>
                  ) : null}

                  {evento.usuarioId !== currentUserId && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      Organizado por: <b>{evento.creador?.nombre}</b>
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {evento.todoElDia
                      ? 'Todo el dia'
                      : `${formatHora(evento.fechaInicio)}${evento.fechaFin ? ` - ${formatHora(evento.fechaFin)}` : ''}`}
                  </div>

                  {evento.descripcion && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', marginTop: '0.75rem', lineHeight: 1.45 }}>
                      {evento.descripcion}
                    </div>
                  )}

                  {(evento.modalidad || evento.ubicacion || evento.urlReunion || evento.instruccionesAcceso) && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {evento.modalidad && (
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                          {evento.modalidad === 'virtual' ? 'REUNION VIRTUAL' : 'REUNION PRESENCIAL'}
                        </div>
                      )}
                      {evento.ubicacion && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                          Ubicacion: <b>{evento.ubicacion}</b>
                        </div>
                      )}
                      {evento.urlReunion && (
                        <div style={{ fontSize: '0.75rem' }}>
                          <a
                            href={evento.urlReunion}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--color-primary)', fontWeight: '800', textDecoration: 'none' }}
                          >
                            Abrir enlace de reunion
                          </a>
                        </div>
                      )}
                      {evento.instruccionesAcceso && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', lineHeight: 1.45 }}>
                          {evento.instruccionesAcceso}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgendaPage;
