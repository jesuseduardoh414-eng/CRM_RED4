// Página de Proyectos (Material Design Premium)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { agendaService, proyectosService, usuariosService } from '../services/api';
import Spinner from '../components/Spinner';
import { 
  Code2, 
  BarChart3, 
  Mail, 
  Folder,
  Trash2, 
  Plus,
  FolderOpen, 
  ChevronRight, 
  Pencil,
  Upload,
  FileText
} from 'lucide-react';

// ── Configuraciones Visuales ────────────────────────────────────────────────
const AREA_CONF = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={14} /> },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: <BarChart3 size={14} /> },
  COMUNICACION:   { label: 'Comunicación',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={14} /> },
};

const ESTADOS = [
  { value: 'ACTIVO',   label: 'Activo',   color: '#00d166', bg: 'rgba(0,209,102,0.12)' },
  { value: 'EN_PAUSA', label: 'En pausa', color: '#ff9100', bg: 'rgba(255,145,0,0.12)' },
  { value: 'CERRADO',  label: 'Cerrado',  color: '#6c757d', bg: 'rgba(108,117,125,0.12)' },
];

const getAreasProyecto = (area) => {
  if (!area) return ['DESARROLLO'];
  return area.split(',').map(a => a.trim()).filter(Boolean);
};

const getLabelAreas = (area) => getAreasProyecto(area)
  .map(a => AREA_CONF[a]?.label || a)
  .join(', ');

const formatFechaCorta = (fecha) => {
  if (!fecha) return 'Sin fecha fin';
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const esAdminUsuario = (usuario) => usuario?.rol?.toString().toUpperCase() === 'ADMIN';

// ── Tarjeta de Proyecto ─────────────────────────────────────────────────────
const ProyectoCard = ({ proyecto, onEditar, onEliminar, onVerDetalle, esAdmin }) => {
  const areaLabel = getLabelAreas(proyecto.area);
  const estado = ESTADOS.find(e => e.value === proyecto.estado) || ESTADOS[0];
  const total = proyecto._count?.tareas || 0;
  const progresoGeneral = proyecto.progresoGeneral ?? proyecto.progreso ?? 0;
  const progresoMiembro = proyecto.progresoMiembro;

  return (
    <div 
      onClick={onVerDetalle}
      className="bg-white border border-slate-100 p-5 lg:p-6 rounded-2xl flex flex-col gap-5 hover:-translate-y-1 transition-all cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <h3 className="text-lg lg:text-xl font-black text-slate-900 truncate mb-1">{proyecto.nombre}</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ color: estado.color, background: estado.bg }}>
              {estado.label}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {areaLabel}
            </span>
          </div>
        </div>
        <div className="text-slate-300">
          <ChevronRight size={20} />
        </div>
      </div>

      <p className="text-sm text-slate-500 font-medium line-clamp-2 min-h-[40px]">
        {proyecto.descripcion || 'Gestión operativa del proyecto y seguimiento de hitos.'}
      </p>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-400">Progreso general</span>
          <span className="text-slate-900">{progresoGeneral}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
            style={{ width: `${progresoGeneral}%` }} 
          />
        </div>
        {progresoMiembro !== null && progresoMiembro !== undefined && (
          <>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-400">Mi progreso</span>
              <span className="text-slate-900">{progresoMiembro}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${progresoMiembro}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
            {proyecto.creador?.nombre?.charAt(0)}
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{total} Tareas</span>
        </div>
        
        {esAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEditar(proyecto); }}
              className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
            >
              <Pencil size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEliminar(proyecto); }}
              className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Modal de Proyecto ────────────────────────────────────────────────────────
const ModalProyecto = ({ proyecto, onClose, onGuardar }) => {
  const { usuario: usuarioActual } = useAuth();
  const usuarioActualEsAdmin = esAdminUsuario(usuarioActual);
  const areasIniciales = getAreasProyecto(proyecto?.area);
  const [form, setForm] = useState({
    nombre: proyecto?.nombre || '',
    descripcion: proyecto?.descripcion || '',
    estado: proyecto?.estado || 'ACTIVO',
    areas: areasIniciales,
    fechaInicio: proyecto?.fechaInicio ? proyecto.fechaInicio.slice(0, 10) : new Date().toISOString().slice(0, 10),
    fechaFin: proyecto?.fechaFin ? proyecto.fechaFin.slice(0, 10) : '',
    miembrosIds: proyecto?.miembros?.filter(m => m.id !== usuarioActual?.id).map(m => m.id) || [],
  });
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [ocupados, setOcupados] = useState({});
  const [consultandoDisponibilidad, setConsultandoDisponibilidad] = useState(false);

  useEffect(() => {
    usuariosService.listar().then(d => setUsuarios(d.usuarios)).catch(console.error);
  }, []);

  // Mostrar todos los usuarios, pero agrupados o resaltados por el área seleccionada
  const usuariosSeleccionables = usuarios.filter(u => u.id !== usuarioActual?.id);
  const usuariosEnAreas = usuariosSeleccionables.filter(u => form.areas.includes(u.area) || esAdminUsuario(u));
  const admins = usuariosSeleccionables.filter(esAdminUsuario);
  const usuariosPorArea = [
    ...form.areas.map(area => ({
      area,
      usuarios: usuariosEnAreas.filter(u => u.area === area && !esAdminUsuario(u)),
    })),
    ...(admins.length > 0 ? [{ area: 'ADMIN', usuarios: admins }] : []),
  ];
  const conflictosEnAreas = usuariosEnAreas
    .filter(u => !esAdminUsuario(u))
    .flatMap(u => (ocupados[u.id] || []).map(conflicto => ({ ...conflicto, usuario: u })))
    .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

  useEffect(() => {
    const consultar = async () => {
      const ids = usuariosEnAreas.map(u => u.id);
      if (ids.length === 0 || !form.fechaInicio) {
        setOcupados({});
        return;
      }

      setConsultandoDisponibilidad(true);
      try {
        const data = await agendaService.consultarDisponibilidad({
          usuarios_ids: ids.join(','),
          inicio: `${form.fechaInicio}T00:00:00`,
          fin: form.fechaFin ? `${form.fechaFin}T23:59:59` : undefined,
          excluir_proyecto_id: proyecto?.id,
        });
        const porUsuario = {};
        data.conflictos?.forEach(conflicto => {
          if (!porUsuario[conflicto.usuarioId]) porUsuario[conflicto.usuarioId] = [];
          porUsuario[conflicto.usuarioId].push(conflicto);
        });
        setOcupados(porUsuario);
      } catch (error) {
        console.error(error);
        setOcupados({});
      } finally {
        setConsultandoDisponibilidad(false);
      }
    };

    consultar();
  }, [form.areas, form.fechaInicio, form.fechaFin, usuarios, usuarioActual?.id]);

  const toggleArea = (area) => {
    setForm(prev => {
      const exists = prev.areas.includes(area);
      const areas = exists ? prev.areas.filter(a => a !== area) : [...prev.areas, area];
      const miembrosPermitidos = usuariosSeleccionables.filter(u => areas.includes(u.area) || esAdminUsuario(u)).map(u => u.id);
      return {
        ...prev,
        areas,
        miembrosIds: prev.miembrosIds.filter(id => miembrosPermitidos.includes(id)),
      };
    });
  };

  const toggleMiembro = (id) => {
    setForm(prev => {
      const exists = prev.miembrosIds.includes(id);
      if (exists) return { ...prev, miembrosIds: prev.miembrosIds.filter(x => x !== id) };
      const usuario = usuariosSeleccionables.find(u => u.id === id);
      if (!usuarioActualEsAdmin && !esAdminUsuario(usuario) && ocupados[id]?.length) return prev;
      return { ...prev, miembrosIds: [...prev.miembrosIds, id] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.areas.length === 0) {
      alert('Selecciona al menos un area');
      return;
    }
    if (form.fechaFin && new Date(`${form.fechaFin}T23:59:59`) <= new Date(`${form.fechaInicio}T00:00:00`)) {
      alert('La fecha fin debe ser posterior a la fecha inicio');
      return;
    }
    setCargando(true);
    try {
      const formData = new FormData();
      formData.append('nombre', form.nombre);
      formData.append('descripcion', form.descripcion);
      formData.append('estado', form.estado);
      formData.append('area', form.areas.join(','));
      formData.append('fechaInicio', form.fechaInicio);
      formData.append('fechaFin', form.fechaFin);
      const idsPermitidos = new Set(usuariosEnAreas.filter(u => usuarioActualEsAdmin || esAdminUsuario(u) || !ocupados[u.id]?.length).map(u => u.id));
      formData.append('miembrosIds', JSON.stringify(form.miembrosIds.filter(id => idsPermitidos.has(id))));
      
      archivos.forEach(file => {
        formData.append('archivos', file);
      });

      if (proyecto) await proyectosService.editar(proyecto.id, formData);
      else await proyectosService.crear(formData);
      onGuardar();
    } catch (err) { alert(err.message); }
    finally { setCargando(false); }
  };

  return (
    <div 
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-end lg:items-center justify-center p-0 lg:p-4"
    >
      <div className="bg-white w-full max-w-xl rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] lg:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-10">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NOMBRE DEL PROYECTO</label>
              <input className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej: Rediseño de Marca" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIPCIÓN</label>
              <textarea className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none" rows="3" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Objetivos y alcance..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESTADO</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AREA RESPONSABLE</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.keys(AREA_CONF).map(k => {
                    const selected = form.areas.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleArea(k)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${selected ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/15' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'}`}
                      >
                        <span>{AREA_CONF[k].label}</span>
                        <span>{selected ? 'Seleccionada' : 'Agregar'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MIEMBROS DE LAS AREAS SELECCIONADAS</label>
                {consultandoDisponibilidad && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Revisando agenda...</span>}
              </div>
              <div className="space-y-3">
                {usuariosPorArea.map(grupo => (
                  <div key={grupo.area} className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                      {grupo.area === 'ADMIN' ? 'Administradores' : AREA_CONF[grupo.area]?.label || grupo.area}
                    </p>
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      {grupo.usuarios.length === 0 && (
                        <span className="text-xs font-bold text-slate-400">Sin miembros en esta area.</span>
                      )}
                      {grupo.usuarios.map(u => {
                        const isSelected = form.miembrosIds.includes(u.id);
                        const conflictos = esAdminUsuario(u) ? [] : ocupados[u.id] || [];
                        const disabled = !usuarioActualEsAdmin && conflictos.length > 0;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleMiembro(u.id)}
                            title={conflictos.length > 0 ? `Tiene tareas/eventos: ${conflictos.map(c => c.titulo).join(', ')}` : ''}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : disabled ? 'bg-red-50 text-red-500 border border-red-100 cursor-not-allowed opacity-70' : conflictos.length > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                          >
                            {isSelected ? 'OK ' : conflictos.length > 0 ? 'Con tareas ' : '+ '}{u.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FECHA INICIO</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FECHA FIN</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CALENDARIO DE RESPONSABLES</label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {usuariosEnAreas.length} miembros visibles
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {usuariosEnAreas.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400">Selecciona un area para ver tareas activas de sus miembros.</p>
                ) : conflictosEnAreas.length === 0 ? (
                  <p className="text-xs font-bold text-emerald-600">Sin tareas activas ni eventos en el rango seleccionado.</p>
                ) : (
                  <div className="space-y-2">
                    {conflictosEnAreas.map(conflicto => (
                      <div key={`${conflicto.id}-${conflicto.usuario.id}`} className="flex items-start justify-between gap-3 rounded-xl bg-white border border-slate-100 p-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{conflicto.titulo}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{conflicto.usuario.nombre}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-red-500">
                          {formatFechaCorta(conflicto.fechaInicio)} - {formatFechaCorta(conflicto.fechaFin)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {false && (
            <div className="hidden">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MIEMBROS POR AREA ({form.areas.join(', ')})</label>
                {consultandoDisponibilidad && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Revisando agenda...</span>}
              </div>
              <div className="flex flex-wrap gap-2 p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                {usuariosPorArea.flatMap(grupo => grupo.usuarios).map(u => {
                  const isSelected = form.miembrosIds.includes(u.id);
                  const conflictos = ocupados[u.id] || [];
                  const disabled = conflictos.length > 0;
                  return (
                    <button
                      key={u.id} type="button"
                      onClick={() => toggleMiembro(u.id)}
                      title={disabled ? `Ocupado: ${conflictos.map(c => c.titulo).join(', ')}` : ''}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : disabled ? 'bg-red-50 text-red-500 border border-red-100 cursor-not-allowed opacity-70' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {isSelected ? '✓ ' : '+ '}{u.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {false && (
            <div className="space-y-3">
              <label className="hidden">OTROS MIEMBROS</label>
              <div className="hidden">
                {[].map(u => {
                  const isSelected = form.miembrosIds.includes(u.id);
                  return (
                    <button
                      key={u.id} type="button"
                      onClick={() => toggleMiembro(u.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {isSelected ? '✓ ' : '+ '}{u.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DOCUMENTOS DE APOYO</label>
              <div className="relative group">
                <input 
                  type="file" multiple 
                  onChange={e => setArchivos([...archivos, ...Array.from(e.target.files)])}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center gap-3 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl group-hover:border-blue-400 transition-all">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500">
                    <Upload size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Haga clic para subir archivos</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">PDF, Word, Excel o Imágenes</p>
                  </div>
                </div>
              </div>
              
              {archivos.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {archivos.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-500" />
                        <span className="text-[10px] font-black text-slate-600 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
                      >
                        <Plus size={16} className="rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse lg:flex-row gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50" disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar Proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Componente Principal ─────────────────────────────────────────────────────
const ProyectosPage = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const esAdmin = usuario?.rol?.toUpperCase() === 'ADMIN';

  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await proyectosService.listar();
      setProyectos(data.proyectos);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setCargando(false); }
  }, [showToast]);

  useEffect(() => {
    const fetch = async () => {
      await cargar();
    };
    fetch();
  }, [cargar]);

  const handleEliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await proyectosService.eliminar(p.id);
      setProyectos(prev => prev.filter(x => x.id !== p.id));
      showToast('Proyecto eliminado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const filtrados = filtro === 'TODOS' ? proyectos : proyectos.filter(p => p.estado === filtro);

  if (cargando) return <Spinner texto="Sincronizando proyectos..." />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">Proyectos</h1>
          <p className="text-sm lg:text-base text-slate-500 font-medium">Gestión estratégica y operativa del equipo</p>
        </div>
        {esAdmin && (
          <button 
            onClick={() => { setEditando(null); setModal(true); }} 
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Nuevo Proyecto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar">
        {['TODOS', 'ACTIVO', 'EN_PAUSA', 'CERRADO'].map(f => (
          <button
            key={f} 
            onClick={() => setFiltro(f)}
            className={`
              whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all snap-start
              ${filtro === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}
            `}
          >
            {f === 'TODOS' ? 'Todos' : ESTADOS.find(e => e.value === f)?.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[32px] p-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
            <FolderOpen size={40} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-1">No se encontraron proyectos</h3>
            <p className="text-sm text-slate-500 font-medium">Comienza creando uno nuevo o cambia el filtro.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map(p => (
            <ProyectoCard 
              key={p.id} proyecto={p} esAdmin={esAdmin} 
              onEditar={(p) => { setEditando(p); setModal(true); }} 
              onEliminar={handleEliminar}
              onVerDetalle={() => navigate(`/proyectos/${p.id}`)}
            />
          ))}
        </div>
      )}

      {modal && <ModalProyecto proyecto={editando} onClose={() => setModal(false)} onGuardar={() => { setModal(false); cargar(); }} />}
    </div>
  );
};

export default ProyectosPage;
