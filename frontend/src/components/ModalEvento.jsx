import { useState, useEffect } from 'react';
import {
  X,
  Save,
  Calendar,
  Users,
  AlertTriangle,
  Trash2,
  Globe,
  Clock,
  MapPin,
  Video,
  Link2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { agendaService, adjuntosService, usuariosService } from '../services/api';
import Modal from './Modal';
import Tooltip from './Tooltip';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import TaskAttachments from './TaskAttachments';
import SelectorRangoFechas from './SelectorRangoFechas';
import SelectorMultiple from './SelectorMultiple';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const COLOR_CATEGORIA = {
  tarea: '#16a34a',
  reunion: '#7c3aed',
  evento: '#2563eb',
};

const getColorCategoria = (tipo) => COLOR_CATEGORIA[tipo] || COLOR_CATEGORIA.evento;

const formatTimeRangeLabel = (start, end, label) => {
  if (!start || !end) return label;
  return `${start} - ${end}`;
};

/**
 * Rango de horas, plegado y en linea.
 *
 * Antes abria una ventana a pantalla completa sobre la ventana del evento. Ya
 * no se usan modales para elegir datos: se despliega aqui mismo, igual que el
 * calendario.
 */
const TimeRangePicker = ({ start, end, onChange }) => {
  const { t } = usePreferences();
  const [abierto, setAbierto] = useState(false);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-3)]"
        >
          <Clock size={16} className="shrink-0 text-[var(--color-primary)]" />
          <span className="flex-1 truncate text-sm font-medium text-[var(--color-text)]">
            {formatTimeRangeLabel(start, end, t('eventSelectTime'))}
          </span>
          <ChevronDown size={15} className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="z-[1500] w-auto p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-dim)]">{t('eventFrom')}</span>
            <input
              type="time"
              value={start}
              onChange={(e) => onChange({ start: e.target.value, end })}
              className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal text-[var(--color-text)] outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-dim)]">{t('eventTo')}</span>
            <input
              type="time"
              value={end}
              onChange={(e) => onChange({ start, end: e.target.value })}
              className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal text-[var(--color-text)] outline-none focus:border-blue-500"
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const TIPOS = [
  { id: 'evento',  labelKey: 'eventTypeEvent',   icon: <Calendar size={16} /> },
  { id: 'reunion', labelKey: 'eventTypeMeeting',  icon: <Users size={16} /> },
];

const buildInitialForm = ({ evento, prefill }) => {
  if (evento) {
    const start = new Date(evento.fechaInicio);
    const end = evento.fechaFin ? new Date(evento.fechaFin) : null;
    let patronParsed = null;
    try {
      patronParsed = evento.patronRecurrencia ? JSON.parse(evento.patronRecurrencia) : null;
    } catch {
      patronParsed = null;
    }

    return {
      titulo: evento.titulo,
      descripcion: evento.descripcion || '',
      tipo: evento.tipo,
      modalidad: evento.modalidad || 'presencial',
      ubicacion: evento.ubicacion || '',
      url_reunion: evento.urlReunion || '',
      instrucciones_acceso: evento.instruccionesAcceso || '',
      fecha_inicio: start.toISOString().split('T')[0],
      hora_inicio: start.toTimeString().slice(0, 5),
      fecha_fin: end ? end.toISOString().split('T')[0] : start.toISOString().split('T')[0],
      hora_fin: end ? end.toTimeString().slice(0, 5) : '10:00',
      todo_el_dia: evento.todoElDia,
      color: getColorCategoria(evento.tipo),
      alerta_minutos: evento.alertaMinutos || 15,
      es_compartido: evento.esCompartido || false,
      es_global: evento.esGlobal || false,
      proyecto_id: evento.proyectoId || '',
      invitados_ids: evento.invitados?.map((i) => i.usuarioId) || [],
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
      modalidad: 'presencial',
      ubicacion: '',
      url_reunion: '',
      instrucciones_acceso: '',
      fecha_inicio: start.toISOString().split('T')[0],
      hora_inicio: start.toTimeString().slice(0, 5),
      fecha_fin: start.toISOString().split('T')[0],
      hora_fin: '10:00',
      todo_el_dia: false,
      color: getColorCategoria('evento'),
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
    modalidad: 'presencial',
    ubicacion: '',
    url_reunion: '',
    instrucciones_acceso: '',
    fecha_inicio: '',
    hora_inicio: '09:00',
    fecha_fin: '',
    hora_fin: '10:00',
    todo_el_dia: false,
    color: getColorCategoria('evento'),
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
};

/**
 * Pasos del alta de evento. El usuario eligio este agrupamiento: primero lo que
 * define el evento, luego donde ocurre y al final quien participa.
 */
const PASOS_EVENTO = [
  { id: 1, labelKey: 'eventStepBasics' },
  { id: 2, labelKey: 'eventStepWhere' },
  { id: 3, labelKey: 'eventStepWho' },
];

const ModalEvento = ({ evento, prefill, onClose, onSave, onDelete }) => {
  const { t } = usePreferences();
  const [form, setForm] = useState(() => buildInitialForm({ evento, prefill }));
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [paso, setPaso] = useState(1);

  const esDuenio = !evento || evento.usuarioId === usuario?.id || evento.creadoPorId === usuario?.id;
  const esVirtual = form.modalidad === 'virtual';

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

  useEffect(() => {
    let active = true;

    if (form.es_compartido && !form.es_global && form.invitados_ids.length > 0 && form.fecha_inicio) {
      const fetchDisp = async () => {
        try {
          const res = await agendaService.consultarDisponibilidad({
            usuarios_ids: form.invitados_ids.join(','),
            inicio: `${form.fecha_inicio}T${form.hora_inicio || '00:00'}`,
            fin: `${form.fecha_fin || form.fecha_inicio}T${form.hora_fin || '23:59'}`,
            excluir_id: evento?.id,
          });
          if (active) setDisponibilidad(res.conflictos || []);
        } catch (err) {
          if (active) console.error('Error disponibilidad', err);
        }
      };

      fetchDisp();
    }

    return () => {
      active = false;
      setDisponibilidad([]);
    };
  }, [form.es_compartido, form.es_global, form.invitados_ids, form.fecha_inicio, form.hora_inicio, form.fecha_fin, form.hora_fin, evento?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.es_recurrente && form.recur_dias.length === 0) {
      showToast(t('eventRecurringNoDay'), 'error');
      return;
    }

    setCargando(true);
    try {
      const fInicio = new Date(`${form.fecha_inicio}T${form.hora_inicio || '00:00'}`);
      let fFin = null;
      if (form.tipo !== 'dia_completo') fFin = new Date(`${form.fecha_fin}T${form.hora_fin || '23:59'}`);
      else if (form.tipo === 'dia_completo') fFin = new Date(`${form.fecha_fin}T23:59:59`);

      if (Number.isNaN(fInicio.getTime()) || (fFin && Number.isNaN(fFin.getTime()))) {
        showToast(t('eventInvalidDateTime'), 'error');
        return;
      }

      if (fFin && fFin <= fInicio) {
        showToast(t('eventEndAfterStart'), 'error');
        return;
      }

      if (form.url_reunion) {
        try {
          new URL(form.url_reunion);
        } catch {
          showToast(t('eventInvalidMeetingLink'), 'error');
          return;
        }
      }

      const payload = {
        ...form,
        color: getColorCategoria(form.tipo),
        fecha_inicio: fInicio.toISOString(),
        fecha_fin: fFin ? fFin.toISOString() : null,
        todo_el_dia: form.tipo === 'dia_completo' ? true : form.todo_el_dia,
        proyecto_id: form.proyecto_id ? parseInt(form.proyecto_id, 10) : null,
        patron_recurrencia: form.es_recurrente
          ? {
              tipo: 'semanal',
              dias: form.recur_dias,
              horaInicio: form.recur_hora_inicio,
              horaFin: form.recur_hora_fin,
            }
          : null,
        fecha_fin_recurrencia: form.fecha_fin_recurrencia || null,
      };

      let eventoGuardado = evento;
      if (evento) {
        const res = await agendaService.editar(evento.id, payload);
        eventoGuardado = res.evento || evento;
      } else {
        const res = await agendaService.crear(payload);
        eventoGuardado = res.evento;
      }

      if (archivos.length > 0 && eventoGuardado?.id) {
        await adjuntosService.subir(eventoGuardado.id, archivos, 'agenda');
        setArchivos([]);
      }

      onSave();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  // Al editar no hay pasos: se ve todo de corrido, igual que en proyectos.
  const conPasos = !evento;
  const enPaso = (n) => !conPasos || paso === n;

  const validarPaso = (n) => {
    if (n === 1 && !form.titulo.trim()) return t('eventTitleRequired');
    return null;
  };

  const avanzar = () => {
    const error = validarPaso(paso);
    if (error) { showToast?.(error, 'error'); return; }
    setPaso((n) => Math.min(PASOS_EVENTO.length, n + 1));
  };

  // Uno mismo nunca aparece en la lista: ya esta dentro por ser el creador.
  const miembrosElegibles = usuarios.filter((u) => u.id !== usuario?.id);

  const togggleInvitado = (userId) => {
    setForm((prev) => {
      const ids = [...prev.invitados_ids];
      const idx = ids.indexOf(userId);
      if (idx > -1) ids.splice(idx, 1);
      else ids.push(userId);
      return { ...prev, invitados_ids: ids };
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      maxWidth="760px"
      // Alto fijo mientras se crea: cada paso tiene distinto largo y sin esto la
      // ventana crecia y encogia al avanzar, moviendo los botones de sitio.
      // Al consultar o editar se deja crecer con el contenido.
      height={conPasos ? 'min(680px, 90vh)' : undefined}
      title={!evento ? t('eventNew') : esDuenio ? t('eventEdit') : t('eventDetails')}
    >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Indicador de pasos. Solo al crear: para consultar o editar es mas
              comodo ver todo de corrido. */}
          {conPasos && (
            <div className="flex items-center gap-2">
              {PASOS_EVENTO.map((item, indice) => {
                const activo = paso === item.id;
                const cumplido = paso > item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cumplido && setPaso(item.id)}
                    disabled={!cumplido}
                    className={`flex min-w-0 flex-1 flex-col gap-1.5 text-left ${cumplido ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`h-1 rounded-full transition-colors ${activo || cumplido ? 'bg-blue-600' : 'bg-[var(--color-surface-3)]'}`} />
                    <span className={`truncate text-xs ${activo ? 'font-medium text-[var(--color-text)]' : 'font-normal text-[var(--color-text-muted)]'}`}>
                      {indice + 1}. {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Paso 1: lo basico ───────────────────────────────────────── */}
          {enPaso(1) && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ }}>{t('eventTitleLabel')}</label>
              {esDuenio ? (
                <input className="form-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required placeholder={t('eventTitlePlaceholder')} />
              ) : (
                <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-text)', padding: '0.5rem 0' }}>{form.titulo}</div>
              )}
            </div>
            {esDuenio && (
              <div className="form-group">
                <label className="form-label" style={{ }}>{t('eventCategory')}</label>
                <select
                  className="form-input form-select"
                  style={{ fontSize: '1rem', padding: '0.85rem 1.25rem' }}
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value, color: getColorCategoria(e.target.value) })}
                  disabled={!esDuenio}
                >
                  {TIPOS.map((tipo) => <option key={tipo.id} value={tipo.id}>{t(tipo.labelKey)}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ }}>{t('taskDescription')}</label>
            {esDuenio ? (
              <textarea
                className="form-input"
                style={{ minHeight: '84px', resize: 'vertical' }}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder={t('eventDescriptionPlaceholder')}
              />
            ) : (
              <div style={{ fontSize: '0.95rem', color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
                {form.descripcion || t('taskNoDescription')}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ }}>{t('eventDuration')}</label>
              {esDuenio ? (
                // Calendario plegado en linea. Antes abria una ventana sobre la
                // ventana del evento; ya no se usan modales para esto.
                <SelectorRangoFechas
                  plegable
                  conLeyenda={false}
                  desde={form.fecha_inicio}
                  hasta={form.fecha_fin && form.fecha_fin !== form.fecha_inicio ? form.fecha_fin : ''}
                  onChange={({ desde, hasta }) => setForm((prev) => ({
                    ...prev,
                    fecha_inicio: desde,
                    // Un evento de un solo dia comparte inicio y fin
                    fecha_fin: hasta || desde,
                  }))}
                />
              ) : (
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  fontWeight: 500,
                  color: 'var(--color-text)'
                }}>
                  {new Date(form.fecha_inicio).toLocaleDateString()} - {new Date(form.fecha_fin || form.fecha_inicio).toLocaleDateString()}
                </div>
              )}
            </div>

            {form.tipo !== 'dia_completo' && (
              <div className="form-group">
                <label className="form-label" style={{ }}>{t('eventSelectTime')}</label>
                {esDuenio ? (
                  <TimeRangePicker
                    start={form.hora_inicio}
                    end={form.hora_fin}
                    onChange={({ start, end }) => setForm((prev) => ({ ...prev, hora_inicio: start, hora_fin: end }))}
                  />
                ) : (
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    fontWeight: 500,
                    color: 'var(--color-text)'
                  }}>
                    {form.hora_inicio} - {form.hora_fin}
                  </div>
                )}
              </div>
            )}
          </div>

          </>)}

          {/* ── Paso 2: donde ocurre ────────────────────────────────────── */}
          {enPaso(2) && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ }}>{t('eventModality')}</label>
              {esDuenio ? (
                <div style={{ display: 'flex', gap: '0.35rem', height: '48px', background: 'var(--color-bg-base)', padding: '0.25rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modalidad: 'presencial' })}
                    style={{
                      flex: 1,
                      height: '100%',
                      padding: '0 0.75rem',
                      borderRadius: '0.6rem',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: !esVirtual ? 'var(--color-primary)' : 'transparent',
                      color: !esVirtual ? '#fff' : 'var(--color-text-dim)',
                    }}
                  >
                    {t('eventInPerson')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modalidad: 'virtual' })}
                    style={{
                      flex: 1,
                      height: '100%',
                      padding: '0 0.75rem',
                      borderRadius: '0.6rem',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: esVirtual ? 'var(--color-primary)' : 'transparent',
                      color: esVirtual ? '#fff' : 'var(--color-text-dim)',
                    }}
                  >
                    {t('eventRemote')}
                  </button>
                </div>
              ) : (
                <div style={{ fontWeight: 500 }}>{esVirtual ? t('eventRemote') : t('eventInPerson')}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {esVirtual ? <Link2 size={14} /> : <MapPin size={14} />}
                {esVirtual ? t('eventLinkLabel') : t('eventLocation')}
              </label>
              {esDuenio ? (
                esVirtual ? (
                  <input
                    className="form-input"
                    style={{ height: '48px' }}
                    value={form.url_reunion}
                    onChange={(e) => setForm({ ...form, url_reunion: e.target.value })}
                    placeholder={t('eventLinkPlaceholder')}
                  />
                ) : (
                  <input
                    className="form-input"
                    style={{ height: '48px' }}
                    value={form.ubicacion}
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    placeholder={t('eventLocationPlaceholder')}
                  />
                )
              ) : (
                <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {esVirtual ? (form.url_reunion || t('taskNoDescription')) : (form.ubicacion || t('taskNoDescription'))}
                </div>
              )}
            </div>
          </div>

          {esDuenio && !esVirtual && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Video size={14} />
                {t('eventOptionalLink')}
              </label>
              <input
                className="form-input"
                value={form.url_reunion}
                onChange={(e) => setForm({ ...form, url_reunion: e.target.value })}
                placeholder={t('eventOptionalRemotePlaceholder')}
              />
            </div>
          )}

          {/* La nota va sola a lo ancho: es el unico campo de varias lineas del
              paso y emparejarlo con uno de una dejaba medio hueco vacio. */}
          <div>
            <div className="form-group">
              <label className="form-label" style={{ }}>
                {esVirtual ? t('eventInstructions') : t('eventLogistics')}
              </label>
              {esDuenio ? (
                <textarea
                  className="form-input"
                  style={{ minHeight: '84px', resize: 'vertical' }}
                  value={form.instrucciones_acceso}
                  onChange={(e) => setForm({ ...form, instrucciones_acceso: e.target.value })}
                  placeholder={esVirtual ? t('eventVirtualAccessPlaceholder') : t('eventInPersonAccessPlaceholder')}
                />
              ) : (
                <div style={{ fontSize: '0.95rem', color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
                  {form.instrucciones_acceso || t('taskNoDescription')}
                </div>
              )}
            </div>

          </div>

          </>)}

          {/* ── Paso 3: quien participa ─────────────────────────────────── */}
          {enPaso(3) && esDuenio && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 1rem', background: 'var(--color-surface-2)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <Users size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{t('eventCollaboration')}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>{t('eventCollaborationDesc')}</div>
                </div>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                <input type="checkbox" checked={form.es_compartido} onChange={(e) => setForm({ ...form, es_compartido: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} disabled={!esDuenio} />
                <span className="slider" style={{ position: 'absolute', cursor: esDuenio ? 'pointer' : 'default', top: 0, left: 0, right: 0, bottom: 0, background: form.es_compartido ? 'var(--color-primary)' : '#cbd5e1', transition: '.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', height: '20px', width: '20px', left: form.es_compartido ? '26px' : '4px', bottom: '4px', background: 'white', transition: '.4s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>
          )}

          {esDuenio && form.es_compartido && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '1rem', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', gap: '0.35rem', height: '44px', background: 'var(--color-bg-base)', padding: '0.25rem', borderRadius: '0.8rem', border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, es_global: true, invitados_ids: [] })}
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '0 0.75rem',
                    borderRadius: '0.55rem',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: form.es_global ? 'var(--color-primary)' : 'transparent',
                    color: form.es_global ? '#fff' : 'var(--color-text-dim)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t('eventAllTeam')}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, es_global: false })}
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '0 0.75rem',
                    borderRadius: '0.55rem',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: !form.es_global ? 'var(--color-primary)' : 'transparent',
                    color: !form.es_global ? '#fff' : 'var(--color-text-dim)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t('eventSpecificMembers')}
                </button>
              </div>

              {!form.es_global ? (
                <>
                  {/* Antes era la lista completa del equipo dentro de la
                      ventana, una fila con foto y correo por persona. Con diez
                      o mas ocupaba toda la pantalla. Ahora es un campo que se
                      despliega, con buscador, y los elegidos salen como fichas
                      debajo. */}
                  <div className="form-group">
                    <label className="form-label">{t('eventSelectMembers')}</label>
                    <SelectorMultiple
                      conBuscador
                      placeholder={t('eventPickMembers')}
                      vacioTexto={t('eventNoMembers')}
                      seleccionados={form.invitados_ids}
                      onToggle={togggleInvitado}
                      opciones={miembrosElegibles.map((u) => ({ valor: u.id, etiqueta: u.nombre }))}
                    />
                  </div>

                  {/* Las fichas van en una sola fila que desplaza en horizontal.
                      Envolviendo, cada cinco invitados se anadia un renglon y el
                      paso crecia hacia abajo sin control. */}
                  {form.invitados_ids.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
                      {form.invitados_ids.map((id) => {
                        const u = usuarios.find((x) => x.id === id);
                        if (!u) return null;
                        return (
                          <div
                            key={`chip-${id}`}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.7rem', background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid rgba(99,102,241,0.2)', whiteSpace: 'nowrap' }}
                          >
                            {u.nombre}
                            <X size={13} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => togggleInvitado(id)} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {form.invitados_ids.length > 0 && disponibilidad.length > 0 && (
                    <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <AlertTriangle size={16} /> {t('eventConflicts')} ({disponibilidad.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {disponibilidad.slice(0, 3).map((d, idx) => (
                          <div key={`disp-${d.id || idx}`} style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600, paddingLeft: '0.5rem', borderLeft: '2px solid #b45309' }}>
                            {t('eventBusyFrom')} {new Date(d.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(d.fechaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
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
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '0.2rem' }}>{t('eventPublicLabel')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', opacity: 0.8, fontWeight: 500, lineHeight: 1.4 }}>
                      {t('eventPublicDesc')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Los documentos cierran el paso 3: son lo mas opcional de todo */}
          {enPaso(3) && (
            <TaskAttachments
              tareaId={evento?.id}
              type="agenda"
              title={`${t('eventDocuments')} · ${t('fieldOptional')}`}
              pendingFiles={archivos}
              onPendingFilesChange={setArchivos}
              showUploader={esDuenio}
              showExisting={Boolean(evento?.id)}
              uploadLabel={evento ? t('projectAddFiles') : t('projectSelectFiles')}
            />
          )}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', paddingBottom: '0.5rem' }}>
            {evento && esDuenio && (
              <Tooltip label={t('delete')}>
                <button
                  type="button"
                  onClick={() => onDelete(evento.id)}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#f87171', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                >
                  <Trash2 size={18} />
                </button>
              </Tooltip>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => (conPasos && paso > 1 ? setPaso(paso - 1) : onClose())}
            >
              {conPasos && paso > 1 ? t('back') : esDuenio ? t('cancel') : t('close')}
            </Button>

            {/* Siguiente mientras queden pasos; en el ultimo, guardar */}
            {esDuenio && conPasos && paso < PASOS_EVENTO.length ? (
              <Button type="button" size="lg" className="flex-[2]" onClick={avanzar}>
                {t('next')} <ChevronRight size={16} />
              </Button>
            ) : esDuenio && (
              <Button type="submit" size="lg" className="flex-[2]" disabled={cargando}>
                <Save size={16} /> {cargando ? t('saving') : evento ? t('eventUpdateButton') : t('eventCreateButton')}
              </Button>
            )}
          </div>
        </form>
    </Modal>
  );
};

export default ModalEvento;
