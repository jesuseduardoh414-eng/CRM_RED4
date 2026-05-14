// Página de Gestión de Usuarios (Solo Admin)
import { Fragment, useState, useEffect, useCallback } from 'react';
import { proyectosService, tareasService, usuariosService, statsService } from '../services/api';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import { 
  Pencil, 
  Trash2, 
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCcw,
  UserX,
  UserCheck,
  Activity,
  CalendarDays,
  PlayCircle,
  ChevronDown
} from 'lucide-react';

const AREAS = ['DESARROLLO', 'ADMINISTRACION', 'COMUNICACION'];
const ROLES = ['MIEMBRO', 'ADMIN'];

const actividadVacia = () => ({
  hechasHoy: [],
  enProgreso: [],
  faltanHoy: [],
  faltanSemana: [],
  totales: {
    hechasHoy: 0,
    enProgreso: 0,
    faltanHoy: 0,
    faltanSemana: 0
  }
});

const ordenarPorFecha = (a, b) => {
  if (!a.venceEn && !b.venceEn) return a.titulo.localeCompare(b.titulo);
  if (!a.venceEn) return 1;
  if (!b.venceEn) return -1;
  return new Date(a.venceEn) - new Date(b.venceEn);
};

const actividadDesdeTareas = (usuarioId, tareas) => {
  const usuarioTareas = tareas.filter(t => t.asignadoId === usuarioId || t.creadorId === usuarioId);
  const actividad = actividadVacia();

  actividad.hechasHoy = usuarioTareas.filter(t => t.estado === 'HECHO').sort(ordenarPorFecha);
  actividad.enProgreso = usuarioTareas.filter(t => t.estado === 'EN_PROGRESO').sort(ordenarPorFecha);
  actividad.faltanHoy = usuarioTareas.filter(t => t.estado === 'PENDIENTE').sort(ordenarPorFecha);
  actividad.faltanSemana = usuarioTareas.filter(t => t.estado !== 'HECHO' && t.venceEn).sort(ordenarPorFecha);

  actividad.totales = {
    hechasHoy: actividad.hechasHoy.length,
    enProgreso: actividad.enProgreso.length,
    faltanHoy: actividad.faltanHoy.length,
    faltanSemana: actividad.faltanSemana.length
  };

  return actividad;
};

const TaskMini = ({ tarea }) => (
  <div className="py-2 border-b border-slate-100 last:border-0">
    <div className="text-xs font-black text-slate-800 leading-snug">{tarea.titulo}</div>
    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
      <span className="truncate">{tarea.proyecto?.nombre || 'Sin proyecto'}</span>
      {tarea.venceEn && <span className="shrink-0">{new Date(tarea.venceEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>}
    </div>
  </div>
);

const ActivityColumn = ({ title, count, icon, color, items, empty }) => (
  <div className="min-w-0">
    <div className="flex items-center justify-between gap-2 mb-2">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color }}>
        {icon}
        {title}
      </div>
      <span className="text-xs font-black" style={{ color }}>{count}</span>
    </div>
    <div className="bg-white rounded-xl border border-slate-100 px-3 py-1 min-h-[58px]">
      {items?.length ? items.map(t => <TaskMini key={t.id} tarea={t} />) : (
        <div className="h-11 flex items-center text-[11px] font-bold text-slate-400">{empty}</div>
      )}
    </div>
  </div>
);

const UserActivityPanel = ({ actividad }) => {
  if (!actividad) {
    return <div className="text-xs font-bold text-slate-400">Sin datos de actividad.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
      <ActivityColumn
        title="Hechas"
        count={actividad.totales?.hechasHoy || 0}
        color="#16a34a"
        icon={<CheckCircle2 size={13} />}
        items={actividad.hechasHoy}
        empty="Sin completadas"
      />
      <ActivityColumn
        title="Haciendo"
        count={actividad.totales?.enProgreso || 0}
        color="#2563eb"
        icon={<PlayCircle size={13} />}
        items={actividad.enProgreso}
        empty="Sin tareas en curso"
      />
      <ActivityColumn
        title="Faltan"
        count={actividad.totales?.faltanHoy || 0}
        color="#dc2626"
        icon={<Clock size={13} />}
        items={actividad.faltanHoy}
        empty="Sin pendientes"
      />
      <ActivityColumn
        title="Faltan semana"
        count={actividad.totales?.faltanSemana || 0}
        color="#f59e0b"
        icon={<CalendarDays size={13} />}
        items={actividad.faltanSemana}
        empty="Sin pendientes próximos"
      />
    </div>
  );
};

const UsuariosPage = () => {
  const [tab, setTab] = useState('activos'); // 'activos' o 'invitaciones'
  const [usuarios, setUsuarios] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalInvitar, setModalInvitar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    setCargando(true);
    try {
      if (tab === 'activos') {
        const data = await usuariosService.listar();
        let usuariosActivos = data.usuarios || [];

        try {
          const proyectosData = await proyectosService.listar();
          const proyectos = proyectosData.proyectos || [];
          const tareasPorProyecto = await Promise.all(
            proyectos.map(async (proyecto) => {
              const dataTareas = await tareasService.listar(proyecto.id);
              return (dataTareas.tareas || []).map(t => ({
                ...t,
                proyecto: t.proyecto || { id: proyecto.id, nombre: proyecto.nombre }
              }));
            })
          );
          const todasTareas = tareasPorProyecto.flat();

          usuariosActivos = usuariosActivos.map(u => ({
            ...u,
            actividad: actividadDesdeTareas(u.id, todasTareas)
          }));
        } catch (tareasError) {
          console.error('No se pudo armar actividad desde tareas:', tareasError);

          try {
            const stats = await statsService.getAdminStats();
            const actividadPorUsuario = new Map((stats.actividadMiembros || []).map(item => [item.id, item]));
            usuariosActivos = usuariosActivos.map(u => ({
              ...u,
              actividad: actividadPorUsuario.get(u.id)?.actividad || actividadPorUsuario.get(u.id) || u.actividad
            }));
          } catch (statsError) {
            console.error('No se pudo cargar actividad desde stats/admin:', statsError);
          }
        }

        setUsuarios(usuariosActivos);
      } else {
        const data = await usuariosService.listarInvitaciones();
        setInvitaciones(data);
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  }, [tab, showToast]);

  useEffect(() => { 
    const fetch = async () => {
      await fetchData();
    };
    fetch();
  }, [fetchData]);

  const handleEliminar = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      await usuariosService.eliminar(id);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      showToast('Usuario eliminado', 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleToggleEstado = async (u) => {
    const nuevoEstado = u.estado === 'activo' ? 'inactivo' : 'activo';
    const msg = nuevoEstado === 'activo' ? 'activado' : 'desactivado';
    try {
      await usuariosService.toggleEstado(u.id, nuevoEstado);
      setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, estado: nuevoEstado } : item));
      showToast(`Usuario ${msg}`, 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleReenviarInvitacion = async (email) => {
    try {
      await usuariosService.reenviarInvitacion(email);
      showToast('Invitación reenviada', 'success');
      fetchData();
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleCargarActividad = async (id) => {
    try {
      const data = await usuariosService.actividad(id);
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, actividad: data.actividad } : u));
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  if (cargando && (usuarios.length === 0 && invitaciones.length === 0)) return <Spinner texto="Cargando..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">Administra el acceso y las invitaciones del equipo.</p>
        </div>
        <button 
          onClick={() => setModalInvitar(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl md:rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          <span className="text-sm">+ Invitar usuario</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setTab('activos')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'activos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Miembros activos
        </button>
        <button 
          onClick={() => setTab('invitaciones')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'invitaciones' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Invitaciones
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {tab === 'activos' ? (
          <TablaActivos 
            usuarios={usuarios} 
            onEdit={(u) => { setUsuarioEditando(u); setModalEditar(true); }}
            onDelete={handleEliminar}
            onToggleStatus={handleToggleEstado}
            onLoadActivity={handleCargarActividad}
          />
        ) : (
          <TablaInvitaciones 
            invitaciones={invitaciones} 
            onResend={handleReenviarInvitacion}
          />
        )}
      </div>

      {/* Modales */}
      {modalInvitar && (
        <ModalInvitar 
          onClose={() => setModalInvitar(false)} 
          onSuccess={() => { setModalInvitar(false); setTab('invitaciones'); fetchData(); }}
        />
      )}

      {modalEditar && (
        <ModalEditar 
          usuario={usuarioEditando}
          onClose={() => { setModalEditar(false); setUsuarioEditando(null); }} 
          onSuccess={() => { setModalEditar(false); setUsuarioEditando(null); fetchData(); }}
        />
      )}
    </div>
  );
};

const TablaActivos = ({ usuarios, onEdit, onDelete, onToggleStatus, onLoadActivity }) => {
  const [actividadAbierta, setActividadAbierta] = useState(null);

  if (usuarios.length === 0) return <div className="p-12 text-center text-slate-400">No hay miembros activos.</div>;

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <table className="hidden md:table w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Miembro</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Área</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Rol</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Registro</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {usuarios.map(u => (
            <Fragment key={u.id}>
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{u.nombre}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                  {u.area}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg border ${
                  u.rol === 'ADMIN' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {u.rol}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                {new Date(u.creadoEn).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${u.estado === 'activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${u.estado === 'activo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={async () => {
                      if (actividadAbierta !== u.id) await onLoadActivity(u.id);
                      setActividadAbierta(prev => prev === u.id ? null : u.id);
                    }}
                    title="Ver actividad"
                    className={`p-2 rounded-xl transition-all ${actividadAbierta === u.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                  >
                    <Activity size={18} />
                  </button>
                  <button 
                    onClick={() => onToggleStatus(u)}
                    title={u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    className={`p-2 rounded-xl transition-all ${u.estado === 'activo' ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                  >
                    {u.estado === 'activo' ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>
                  <button 
                    onClick={() => onEdit(u)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => onDelete(u.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
            {actividadAbierta === u.id && (
              <tr key={`${u.id}-actividad`} className="bg-slate-50/70">
                <td colSpan={6} className="px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Actividad de {u.nombre}</div>
                    <button
                      onClick={() => setActividadAbierta(null)}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700"
                    >
                      Cerrar <ChevronDown size={13} className="rotate-180" />
                    </button>
                  </div>
                  <UserActivityPanel actividad={u.actividad} />
                </td>
              </tr>
            )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-4 p-4">
        {usuarios.map(u => (
          <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-black text-slate-900">{u.nombre}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{u.email}</div>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${
                u.rol === 'ADMIN' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {u.rol}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200/50">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área</span>
                <span className="text-xs font-bold text-slate-700">{u.area}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                <span className={`text-xs font-black uppercase ${u.estado === 'activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {u.estado}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] text-slate-400 font-medium italic">
                Reg: {new Date(u.creadoEn).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onToggleStatus(u)}
                  className={`p-2.5 rounded-xl border transition-all ${u.estado === 'activo' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}
                >
                  {u.estado === 'activo' ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
                <button 
                  onClick={() => onEdit(u)}
                  className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => onDelete(u.id)}
                  className="p-2.5 bg-red-50 text-red-500 border border-red-100 rounded-xl"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200/50">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                <Activity size={13} /> Actividad
              </div>
              <UserActivityPanel actividad={u.actividad} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TablaInvitaciones = ({ invitaciones, onResend }) => {
  if (invitaciones.length === 0) return <div className="p-12 text-center text-slate-400">No hay invitaciones enviadas.</div>;

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <table className="hidden md:table w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Invitado</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Área / Rol</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Envío / Expira</th>
            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invitaciones.map(inv => (
            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{inv.nombre}</div>
                    <div className="text-xs text-slate-400">{inv.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-bold text-slate-500 uppercase">{inv.area}</span>
                   <span className="text-[9px] font-bold text-slate-400 uppercase">{inv.rol}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                {inv.estado === 'pendiente' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
                    <Clock size={12} /> Pendiente
                  </span>
                )}
                {inv.estado === 'aceptada' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                    <CheckCircle2 size={12} /> Aceptada
                  </span>
                )}
                {inv.estado === 'expirada' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                    <AlertTriangle size={12} /> Expirada
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-xs font-medium text-slate-500">Enviada: {new Date(inv.creadoEn).toLocaleDateString()}</div>
                <div className="text-[10px] text-slate-400">Expira: {new Date(inv.expiraEn).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 text-right">
                {inv.estado !== 'aceptada' && (
                  <button 
                    onClick={() => onResend(inv.email)}
                    className="flex items-center gap-1.5 ml-auto text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <RefreshCcw size={12} /> Reenviar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-4 p-4">
        {invitaciones.map(inv => (
          <div key={inv.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div className="flex-1">
                <div className="font-black text-slate-900 leading-tight">{inv.nombre}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">{inv.email}</div>
              </div>
              <div className="text-right">
                {inv.estado === 'pendiente' && <div className="text-[9px] font-black text-blue-500 uppercase px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">Pendiente</div>}
                {inv.estado === 'aceptada' && <div className="text-[9px] font-black text-emerald-500 uppercase px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md">Aceptada</div>}
                {inv.estado === 'expirada' && <div className="text-[9px] font-black text-red-500 uppercase px-2 py-0.5 bg-red-50 border border-red-100 rounded-md">Expirada</div>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200/50">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área / Rol</span>
                <span className="text-[10px] font-bold text-slate-700">{inv.area} / {inv.rol}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expira</span>
                <span className="text-xs font-bold text-slate-500">{new Date(inv.expiraEn).toLocaleDateString()}</span>
              </div>
            </div>

            {inv.estado !== 'aceptada' && (
              <button 
                onClick={() => onResend(inv.email)}
                className="w-full flex items-center justify-center gap-2 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 py-3 rounded-xl transition-all border border-blue-100"
              >
                <RefreshCcw size={14} /> Reenviar invitación
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ModalInvitar = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ nombre: '', email: '', area: 'DESARROLLO', rol: 'MIEMBRO' });
  const [cargando, setCargando] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await usuariosService.invitar(form);
      showToast('Invitación enviada');
      onSuccess();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div 
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="p-8 pb-0">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Mail size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Invitar Usuario</h2>
          <p className="text-slate-500 text-xs mt-1">Se enviará un correo con el enlace de registro.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del usuario</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo electrónico</label>
            <input 
              required
              type="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              placeholder="juan@empresa.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.area}
                onChange={e => setForm({...form, area: e.target.value})}
              >
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.rol}
                onChange={e => setForm({...form, rol: e.target.value})}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              disabled={cargando}
              className="flex-1.5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-slate-200"
            >
              {cargando ? 'Enviando...' : <><Send size={18} /> Enviar invitación</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalEditar = ({ usuario, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    area: usuario?.area || 'DESARROLLO',
    rol: usuario?.rol || 'MIEMBRO'
  });
  const [cargando, setCargando] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await usuariosService.editar(usuario.id, form);
      showToast('Usuario actualizado');
      onSuccess();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div 
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="p-8 pb-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Editar Miembro</h2>
          <p className="text-slate-500 text-xs mt-1">Actualiza la información del usuario.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
            <input 
              required
              type="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.area}
                onChange={e => setForm({...form, area: e.target.value})}
              >
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.rol}
                onChange={e => setForm({...form, rol: e.target.value})}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button>
            <button disabled={cargando} className="flex-1.5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:bg-slate-200">
              {cargando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuariosPage;
