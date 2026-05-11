// Servicio de comunicación con el backend
// Centraliza la URL base y el manejo del JWT en cada petición

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Helpers internos ──────────────────────────────────────────────────────

const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('crm_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
};

// ── Auth ──────────────────────────────────────────────────────────────────

export const authService = {
  register: async (datos) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(datos),
    });
    return handleResponse(res);
  },

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  me: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  resetPassword: async (token, password) => {
    const res = await fetch(`${API_URL}/auth/reset-password/${token}`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ password }),
    });
    return handleResponse(res);
  },

  verifyAccount: async (token) => {
    const res = await fetch(`${API_URL}/auth/verify/${token}`);
    return handleResponse(res);
  },
};

// ── Proyectos ─────────────────────────────────────────────────────────────

export const proyectosService = {
  listar: async () => {
    const res = await fetch(`${API_URL}/proyectos`, { headers: getHeaders() });
    return handleResponse(res);
  },

  equipoDeProyecto: async (id) => {
    const res = await fetch(`${API_URL}/proyectos/${id}/equipo`, { headers: getHeaders() });
    return handleResponse(res);
  },

  crear: async (datos) => {
    const isMultipart = datos instanceof FormData;
    const res = await fetch(`${API_URL}/proyectos`, {
      method: 'POST',
      headers: getHeaders(isMultipart),
      body: isMultipart ? datos : JSON.stringify(datos),
    });
    return handleResponse(res);
  },

  editar: async (id, datos) => {
    const res = await fetch(`${API_URL}/proyectos/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(datos),
    });
    return handleResponse(res);
  },

  eliminar: async (id) => {
    const res = await fetch(`${API_URL}/proyectos/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

// ── Tareas ────────────────────────────────────────────────────────────────

export const tareasService = {
  // Listar tareas de un proyecto (también devuelve info del proyecto)
  listar: async (proyectoId) => {
    const res = await fetch(`${API_URL}/proyectos/${proyectoId}/tareas`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  crear: async (proyectoId, datos) => {
    const isMultipart = datos instanceof FormData;
    const res = await fetch(`${API_URL}/proyectos/${proyectoId}/tareas`, {
      method: 'POST',
      headers: getHeaders(isMultipart),
      body: isMultipart ? datos : JSON.stringify(datos),
    });
    return handleResponse(res);
  },

  editar: async (id, datos) => {
    const res = await fetch(`${API_URL}/tareas/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(datos),
    });
    return handleResponse(res);
  },

  eliminar: async (id) => {
    const res = await fetch(`${API_URL}/tareas/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Cambio rápido de estado inline
  actualizarEstado: async (id, estado) => {
    const res = await fetch(`${API_URL}/tareas/${id}/estado`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ estado }),
    });
    return handleResponse(res);
  },
};

// ── Usuarios ──────────────────────────────────────────────────────────────

export const usuariosService = {
  listar: async () => {
    const res = await fetch(`${API_URL}/usuarios`, { headers: getHeaders() });
    return handleResponse(res);
  },
  crear: async (datos) => {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(datos),
    });
    return handleResponse(res);
  },
  editar: async (id, datos) => {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(datos),
    });
    return handleResponse(res);
  },
  eliminar: async (id) => {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

// ── Notificaciones ────────────────────────────────────────────────────────
export const notificacionesService = {
  listar: async () => {
    const res = await fetch(`${API_URL}/notificaciones`, { headers: getHeaders() });
    return handleResponse(res);
  },
  marcarLeida: async (id) => {
    const res = await fetch(`${API_URL}/notificaciones/${id}/leida`, {
      method: 'PUT', headers: getHeaders(),
    });
    return handleResponse(res);
  },
  marcarTodasLeidas: async () => {
    const res = await fetch(`${API_URL}/notificaciones/todas/leidas`, {
      method: 'PUT', headers: getHeaders(),
    });
    return handleResponse(res);
  },
  eliminar: async (id) => {
    const res = await fetch(`${API_URL}/notificaciones/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(res);
  }
};

// ── Comentarios ───────────────────────────────────────────────────────────
export const comentariosService = {
  listar: async (parentId, type = 'tareas') => {
    const res = await fetch(`${API_URL}/${type}/${parentId}/comentarios`, { headers: getHeaders() });
    return handleResponse(res);
  },
  crear: async (parentId, contenido, type = 'tareas') => {
    const res = await fetch(`${API_URL}/${type}/${parentId}/comentarios`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ contenido }),
    });
    return handleResponse(res);
  },
  eliminar: async (comentarioId) => {
    const res = await fetch(`${API_URL}/tareas/comentarios/${comentarioId}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

// ── Historial (Logs) ───────────────────────────────────────────────────────
export const logsService = {
  listarPorProyecto: async (proyectoId) => {
    const res = await fetch(`${API_URL}/proyectos/${proyectoId}/logs`, { headers: getHeaders() });
    return handleResponse(res);
  },
};

// ── Adjuntos ──────────────────────────────────────────────────────────────
export const adjuntosService = {
  listar: async (parentId, type = 'tareas') => {
    const res = await fetch(`${API_URL}/${type}/${parentId}/adjuntos`, { headers: getHeaders() });
    return handleResponse(res);
  },
  subir: async (parentId, formData, type = 'tareas') => {
    const res = await fetch(`${API_URL}/${type}/${parentId}/adjuntos`, {
      method: 'POST',
      headers: getHeaders(true), // Multipart
      body: formData
    });
    return handleResponse(res);
  },
  eliminar: async (adjuntoId) => {
    const res = await fetch(`${API_URL}/tareas/adjuntos/${adjuntoId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  descargar: (filename) => {
    // Abrir en nueva pestaña para descargar
    window.open(`${API_URL}/tareas/adjuntos/descargar/${filename}?token=${localStorage.getItem('crm_token')}`, '_blank');
  }
};

// ── Estadísticas ──────────────────────────────────────────────────────────
export const statsService = {
  getAdminStats: async () => {
    const res = await fetch(`${API_URL}/stats/admin`, { headers: getHeaders() });
    return handleResponse(res);
  }
};
