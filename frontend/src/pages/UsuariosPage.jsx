// Página de Gestión de Usuarios (Solo Admin)
import { Fragment, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { proyectosService, tareasService, usuariosService, statsService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { PageSkeleton } from '../components/Skeleton';
import UserAvatar from '../components/UserAvatar';
import Modal from '../components/Modal';
import Tooltip from '../components/Tooltip';
import ActionMenu from '../components/ActionMenu';
import { useDebounce } from '../utils/useDebounce';
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
  Ban,
  Search,
  X
} from 'lucide-react';

const AREAS = ['DESARROLLO', 'ADMINISTRACION', 'COMUNICACION', 'MARKETING'];
const ROLES = ['MIEMBRO', 'ADMIN'];

const getLocale = () => document.documentElement.lang === 'en' ? 'en-US' : 'es-MX';

const UsuariosPage = () => {
  const { t } = usePreferences();
  const { usuario: usuarioActual } = useAuth();
  const [tab, setTab] = useState('activos');
  const [usuarios, setUsuarios] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [modalInvitar, setModalInvitar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const busquedaDiferida = useDebounce(busqueda, 350);
  const { showToast } = useToast();

  const { 
    data: listado,
    error,
    isLoading,
    mutate 
  } = useSWR(
    // La busqueda forma parte de la clave: SWR cachea cada termino por separado
    // y no revuelve resultados de busquedas distintas.
    tab === 'activos' ? ['usuarios', busquedaDiferida] : ['invitaciones', busquedaDiferida],
    async ([key, q]) => {
      if (key === 'usuarios') {
        const res = await usuariosService.listar({ q });
        return res.usuarios || [];
      }
        return await usuariosService.listarInvitaciones();
    },
    { 
      revalidateOnFocus: false,
      dedupingInterval: 5000 
    }
  );

  useEffect(() => {
    if (tab === 'activos') {
      setUsuarios(listado || []);
    } else {
      setInvitaciones(listado || []);
    }
  }, [listado, tab]);

  useEffect(() => {
    if (error) showToast(error.message, 'error');
  }, [error, showToast]);

  const handleEliminar = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      await usuariosService.eliminar(id);
      mutate();
      showToast('Usuario eliminado', 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleToggleEstado = async (u) => {
    const nuevoEstado = u.estado === 'activo' ? 'inactivo' : 'activo';
    const msg = nuevoEstado === 'activo' ? 'activado' : 'desactivado';
    try {
      await usuariosService.toggleEstado(u.id, nuevoEstado);
      mutate();
      showToast(`Usuario ${msg}`, 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleReenviarInvitacion = async (email) => {
    try {
      await usuariosService.reenviarInvitacion(email);
      showToast('Invitación reenviada', 'success');
      mutate();
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleEliminarInvitacion = async (invitacion) => {
    if (invitacion.estado === 'aceptada') {
      showToast('Las invitaciones aceptadas se conservan como historial', 'error');
      return;
    }

    if (!confirm(`¿Eliminar la invitación de ${invitacion.nombre}?`)) return;

    try {
      await usuariosService.eliminarInvitacion(invitacion.id);
      showToast('Invitación eliminada', 'success');
      mutate();
    } catch (error) { showToast(error.message, 'error'); }
  };


  if (isLoading && (usuarios.length === 0 && invitaciones.length === 0)) return <PageSkeleton cards={4} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-semibold text-[var(--color-text)] tracking-tight">{t('usersManageTitle')}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('usersManageSubtitle')}</p>
        </div>
        <button 
          onClick={() => setModalInvitar(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl md:rounded-2xl font-medium shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          <span className="text-sm">{t('usersInvite')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setTab('activos')}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${tab === 'activos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t('usersActiveMembers')}
        </button>
        <button 
          onClick={() => setTab('invitaciones')}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${tab === 'invitaciones' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t('usersInvitationsTab')}
        </button>
      </div>

      {/* Buscador — solo aplica a miembros activos */}
      {tab === 'activos' && (
        <div className="relative mb-6 max-w-xl">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
            <Search size={18} />
          </span>
            <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t('usersSearchPlaceholder')}
            aria-label={t('usersSearchPlaceholder')}
            className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          {busqueda && (
            <Tooltip label={t('clearSearch')}>
              <button
              type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
              >
                <X size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {tab === 'activos' ? (
          <TablaActivos
            usuarios={usuarios}
            busqueda={busquedaDiferida}
            onEdit={(u) => { setUsuarioEditando(u); setModalEditar(true); }}
            onDelete={handleEliminar}
            onToggleStatus={handleToggleEstado}
          />
        ) : (
          <TablaInvitaciones 
            invitaciones={invitaciones} 
            onResend={handleReenviarInvitacion}
            onDelete={handleEliminarInvitacion}
          />
        )}
      </div>

      {/* Modales */}
      {modalInvitar && (
        <ModalInvitar 
          usuarioActual={usuarioActual}
          onClose={() => setModalInvitar(false)} 
          onSuccess={() => { setModalInvitar(false); setTab('invitaciones'); mutate(); }}
        />
      )}

      {modalEditar && (
        <ModalEditar 
          usuarioActual={usuarioActual}
          usuario={usuarioEditando}
          onClose={() => { setModalEditar(false); setUsuarioEditando(null); }} 
          onSuccess={() => { setModalEditar(false); setUsuarioEditando(null); mutate(); }}
        />
      )}
    </div>
  );
};

const TablaActivos = ({ usuarios, onEdit, onDelete, onToggleStatus, busqueda = '' }) => {
  const { t } = usePreferences();

  if (usuarios.length === 0) {
  return (
      <div className="p-12 text-center text-[var(--color-text-muted)]">
        {busqueda ? `${t('searchNoResults')}: "${busqueda}"` : t('usersNoActiveMembers')}
      </div>
  );
  }

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <table className="hidden md:table w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableMember')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableArea')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableRole')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableRegister')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableStatus')}</th>
            <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 tracking-wider">{t('usersTableActions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {usuarios.map(u => (
            <Fragment key={u.id}>
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    usuario={u}
                    size={40}
                    radius={12}
                    fontSize="0.9rem"
                    color="var(--color-primary)"
                    background="rgba(37,99,235,0.08)"
                    borderColor="rgba(37,99,235,0.18)"
                  />
                  <div>
                    <div className="font-medium text-slate-900">{u.nombre}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-[10px] font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                  {u.area}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border ${
                  u.rol === 'ADMIN' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {u.rol}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                {new Date(u.creadoEn).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.estado === 'activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${u.estado === 'activo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {u.estado === 'activo' ? t('usersStatusActive') : t('usersStatusInactive')}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end items-center gap-2">
                  <ActionMenu
                    size={18}
                    items={[
                      {
                        label: u.estado === 'activo' ? t('usersDeactivate') : t('usersActivate'),
                        icon: u.estado === 'activo' ? <UserX size={15} /> : <UserCheck size={15} />,
                        onSelect: () => onToggleStatus(u),
                      },
                      { label: t('edit'), icon: <Pencil size={15} />, onSelect: () => onEdit(u) },
                      { separator: true },
                      { label: t('delete'), icon: <Trash2 size={15} />, onSelect: () => onDelete(u.id), danger: true },
                    ]}
                  />
                </div>
              </td>
            </tr>
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
                <UserAvatar
                  usuario={u}
                  size={40}
                  radius={12}
                  fontSize="0.9rem"
                  color="#ffffff"
                  background="var(--color-primary)"
                  borderColor="transparent"
                />
                <div>
                  <div className="font-medium text-slate-900">{u.nombre}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{u.email}</div>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-medium ${
                u.rol === 'ADMIN' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {u.rol}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200/50">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-medium text-slate-400">{t('usersTableArea')}</span>
                <span className="text-xs font-medium text-slate-700">{u.area}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[9px] font-medium text-slate-400">{t('usersTableStatus')}</span>
                <span className={`text-xs font-medium ${u.estado === 'activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {u.estado}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] text-slate-400 font-medium italic">
                {t('usersRegShort')} {new Date(u.creadoEn).toLocaleDateString(getLocale())}
              </div>
              <ActionMenu
                size={16}
                className="p-2.5 border border-[var(--color-border)]"
                items={[
                  { label: t('edit'), icon: <Pencil size={15} />, onSelect: () => onEdit(u) },
                  {
                    label: u.estado === 'activo' ? t('usersDeactivate') : t('usersActivate'),
                    icon: u.estado === 'activo' ? <UserX size={15} /> : <UserCheck size={15} />,
                    onSelect: () => onToggleStatus(u),
                  },
                  { separator: true },
                  { label: t('delete'), icon: <Trash2 size={15} />, onSelect: () => onDelete(u.id), danger: true },
                ]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TablaInvitaciones = ({ invitaciones, onResend, onDelete }) => {
  const { t } = usePreferences();
  if (invitaciones.length === 0) return <div className="p-12 text-center text-[var(--color-text-muted)]">{t('usersNoResults')}</div>;

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <table className="hidden md:table w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableMember')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableArea')} / {t('usersTableRole')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableStatus')}</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 tracking-wider">{t('usersTableRegister')}</th>
            <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 tracking-wider">{t('usersTableActions')}</th>
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
                    <div className="font-medium text-slate-900">{inv.nombre}</div>
                    <div className="text-xs text-slate-400">{inv.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-medium text-slate-500">{inv.area}</span>
                   <span className="text-[9px] font-medium text-slate-400">{inv.rol}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                {inv.estado === 'pendiente' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                    <Clock size={12} /> {t('usersStatusPending')}
                  </span>
                )}
                {inv.estado === 'aceptada' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100">
                    <CheckCircle2 size={12} /> {t('usersStatusAccepted')}
                  </span>
                )}
                {inv.estado === 'expirada' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
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
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onResend(inv.email)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCcw size={12} /> Reenviar
                    </button>
                    <button
                      onClick={() => onDelete(inv)}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Ban size={12} /> Cancelar
                    </button>
                  </div>
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
                <div className="font-medium text-slate-900 leading-tight">{inv.nombre}</div>
                <div className="text-[10px] text-slate-400 font-medium">{inv.email}</div>
              </div>
              <div className="text-right">
                {inv.estado === 'pendiente' && <div className="text-[9px] font-medium text-blue-500 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">Pendiente</div>}
                {inv.estado === 'aceptada' && <div className="text-[9px] font-medium text-emerald-500 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md">Aceptada</div>}
                {inv.estado === 'expirada' && <div className="text-[9px] font-medium text-red-500 px-2 py-0.5 bg-red-50 border border-red-100 rounded-md">Expirada</div>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-200/50">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-medium text-slate-400">Área / Rol</span>
                <span className="text-[10px] font-medium text-slate-700">{inv.area} / {inv.rol}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[9px] font-medium text-slate-400">Expira</span>
                <span className="text-xs font-medium text-slate-500">{new Date(inv.expiraEn).toLocaleDateString()}</span>
              </div>
            </div>

            {inv.estado !== 'aceptada' && (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => onResend(inv.email)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 py-3 rounded-xl transition-all border border-blue-100"
                >
                  <RefreshCcw size={14} /> Reenviar invitación
                </button>
                <button
                  onClick={() => onDelete(inv)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 py-3 rounded-xl transition-all border border-red-100"
                >
                  <Ban size={14} /> {t('usersCancelInvitation')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ModalInvitar = ({ usuarioActual, onClose, onSuccess }) => {
  const { t } = usePreferences();
  const esAdminArea = usuarioActual?.rol === 'ADMIN' && usuarioActual?.area !== 'ADMINISTRACION';
  const areasDisponibles = esAdminArea ? [usuarioActual.area] : AREAS;
  const [form, setForm] = useState({ nombre: '', email: '', area: areasDisponibles[0] || 'DESARROLLO', rol: 'MIEMBRO' });
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
    <Modal
      open
      onClose={onClose}
      maxWidth="448px"
      title={(
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Mail size={20} />
          </span>
          {t('usersInviteTitle')}
        </span>
      )}
      subtitle={t('usersInviteSubtitle')}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('usersInviteNameLabel')}</label>
            <input
              required
              className="form-input"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
              placeholder={t('usersInviteNamePlaceholder')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('usersInviteEmailLabel')}</label>
            <input
              required
              type="email"
              className="form-input"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              placeholder={t('usersInviteEmailPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldArea')}</label>
              <select 
                disabled={areasDisponibles.length === 1}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.area}
                onChange={e => setForm({...form, area: e.target.value})}
              >
                {areasDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldRole')}</label>
              <select
                className="form-input form-select"
                value={form.rol}
                onChange={e => setForm({...form, rol: e.target.value})}
              >
                {ROLES.map(r => <option key={r} value={r}>{t(r === 'ADMIN' ? 'roleAdmin' : 'roleMember')}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-all"
            >
              {t('cancel')}
            </button>
            <button
              disabled={cargando}
              className="flex-1.5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-slate-200"
            >
              {cargando ? t('usersInviteSending') : <><Send size={18} /> {t('usersInviteSend')}</>}
            </button>
          </div>
        </form>
    </Modal>
  );
};

const ModalEditar = ({ usuarioActual, usuario, onClose, onSuccess }) => {
  const { t } = usePreferences();
  const esAdminArea = usuarioActual?.rol === 'ADMIN' && usuarioActual?.area !== 'ADMINISTRACION';
  const areasDisponibles = esAdminArea ? [usuarioActual.area] : AREAS;
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    area: usuario?.area || areasDisponibles[0] || 'DESARROLLO',
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
    <Modal
      open
      onClose={onClose}
      maxWidth="448px"
      title={t('usersEditTitle')}
      subtitle={t('usersEditSubtitle')}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldName')}</label>
            <input
              required
              className="form-input"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldEmail')}</label>
            <input
              required
              type="email"
              className="form-input"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldArea')}</label>
              <select
                disabled={areasDisponibles.length === 1}
                className="form-input form-select"
                value={form.area}
                onChange={e => setForm({...form, area: e.target.value})}
              >
                {areasDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldRole')}</label>
              <select
                className="form-input form-select"
                value={form.rol}
                onChange={e => setForm({...form, rol: e.target.value})}
              >
                {ROLES.map(r => <option key={r} value={r}>{t(r === 'ADMIN' ? 'roleAdmin' : 'roleMember')}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-all">{t('cancel')}</button>
            <button disabled={cargando} className="flex-1.5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:bg-slate-200">
              {cargando ? t('saving') : t('save')}
            </button>
          </div>
        </form>
    </Modal>
  );
};

export default UsuariosPage;
