# Contexto de trabajo — CRM

> **Para el asistente que retoma este proyecto en otra cuenta.**
> Documento vivo: contiene el backlog completo, el orden de ejecución y el registro de lo ya hecho.
> Creado: **2026-08-07**. Última actualización: **2026-08-07**.
>
> **Estado: Bloque 0 completo** (shadcn instalado, scrollbar, scroll entre páginas, avatares). Siguiente: Bloque 1 (backend: estados de proyecto + paginación/filtros). Ver secciones 5 y 7.

---

## 0-ter. Reglas de publicación y base de datos (decidido por el usuario, 2026-08-07)

1. **Nada se publica ni se sube hasta que el usuario lo apruebe explícitamente.** No hacer `commit` ni `push` por iniciativa propia. El repo es `github.com/r4d-26/CRM_RED4`, rama `master`, y **Vercel despliega automáticamente al hacer push** — por eso subir sin permiso equivale a publicar en producción.
2. **No hay base de datos de pruebas.** El usuario decidió trabajar contra **la misma base real** (Supabase en la nube) y aplicar los cambios directo ahí. Se le explicó el riesgo y lo confirmó; no volver a plantearlo.
3. **Consecuencia a tener presente:** el CRM ya desplegado usa esa misma base. Un cambio de estructura se refleja de inmediato en la app en vivo, aunque el código nuevo todavía no se haya publicado.
4. **Por eso, en cambios de estructura, ir en dos tiempos:** primero solo **agregar** (columnas o valores nuevos, sin quitar ni renombrar), que es compatible con el CRM en vivo; y **quitar o renombrar solo después** de publicar el código nuevo. Aplica en especial a la tarea de estados de proyecto (`EN_PAUSA` → `INACTIVO`, quitar `CERRADO`): renombrar de golpe rompería el CRM que la gente está usando.
5. Antes de cualquier cambio de estructura, **avisarle y recomendar respaldo**.

---

## 0-bis. Forma de trabajo acordada con el usuario

1. **Antes de cada cambio**, explicarle qué se va a hacer y esperar su confirmación. Él aprovecha para precisar lo que quiere; sus títulos de tarea son muy breves y su intención real suele diferir.
2. **Al terminar**, reportarle **qué se hizo y dónde verlo**, en lenguaje de usuario: nombres de pantallas y pasos para probarlo. Nada de rutas de archivos, nombres de componentes ni jerga técnica.
3. Si un cambio **no se ve** en pantalla, decírselo explícitamente para que no lo busque.
4. El detalle técnico va al **registro de avance (sección 7)** de este documento, no a la respuesta al usuario.

---

## 0. Cómo usar este documento

1. Lee la sección **1 (proyecto)** y **2 (reglas)** antes de tocar código.
2. El backlog completo está en la sección **4**, agrupado por módulo tal como lo dictó el usuario.
3. El **orden real de ejecución** es la sección **5** — está agrupado por archivo/dependencia, no por módulo, para no modificar dos veces lo mismo.
4. **Cada vez que se complete algo, anotarlo en la sección 7 (Registro de avance)** y actualizar la memoria del proyecto. Es requisito explícito del usuario.
5. Las dudas abiertas están en la sección **6**. No inventar: si una tarea no se entiende, se anota y se pregunta cuando toque hacerla (el usuario lo pidió así).

---

## 1. El proyecto

- Monorepo: `frontend/` (React 19 + Vite 5 + React Router 7 + SWR) y `backend/` (Express + Prisma + PostgreSQL).
- Deploy: dos proyectos separados en Vercel (ver [README.md](README.md)).
- Rama: `master`.
- Adjuntos ya migrados a Vercel Blob (requiere `BLOB_READ_WRITE_TOKEN`).

### Archivos grandes (ir con cuidado)
| Archivo | Líneas |
|---|---|
| [AgendaPage.jsx](frontend/src/pages/AgendaPage.jsx) | 2154 |
| [DashboardPage.jsx](frontend/src/pages/DashboardPage.jsx) | 1884 |
| [PreferencesContext.jsx](frontend/src/context/PreferencesContext.jsx) | 1112 |
| [ProyectoDetallePage.jsx](frontend/src/pages/ProyectoDetallePage.jsx) | 1055 |
| [ProyectosPage.jsx](frontend/src/pages/ProyectosPage.jsx) | 1009 |
| [ModalEvento.jsx](frontend/src/components/ModalEvento.jsx) | 809 |
| [UsuariosPage.jsx](frontend/src/pages/UsuariosPage.jsx) | 885 |
| [ModalImportar.jsx](frontend/src/components/ModalImportar.jsx) | 734 |
| [GanttView.jsx](frontend/src/components/GanttView.jsx) | 531 |
| [KanbanView.jsx](frontend/src/components/KanbanView.jsx) | 529 |

---

## 2. Reglas del proyecto (obligatorias en cualquier cambio)

1. **i18n**: todo texto visible pasa por `t()` y se agrega en **es** y **en** en [PreferencesContext.jsx](frontend/src/context/PreferencesContext.jsx).
2. **Tema**: colores desde variables CSS (`var(--color-*)` en [index.css](frontend/src/index.css)). **Nunca hex hardcodeado** — rompe el modo oscuro. `darkMode` está configurado como `['selector', '[data-theme="dark"]']`.
3. El código actual mezcla Tailwind con `style={{...}}` inline. La migración a shadcn (Bloque 0) es la que corrige esto; mientras tanto, respetar el estilo del archivo que se toca.

---

## 3. Situación técnica relevante para el backlog

- **shadcn NO está instalado.** No hay `components.json`, ni Radix, ni `clsx`/`cva`/`tailwind-merge`.
- **No hay alias de rutas** (`@/`): no existe `jsconfig.json` ni `resolve.alias` en `vite.config.js`. shadcn lo requiere.
- **Tailwind v3.4.19** vía PostCSS. Ojo: `package.json` también declara `@tailwindcss/vite ^4.3.0` **sin usar** (el propio `vite.config.js` lo aclara en un comentario). Es residuo, conviene quitarlo.
- **Estados de proyecto**: hoy son `ACTIVO / EN_PAUSA / CERRADO`, definidos en tres lugares distintos → [ProyectosPage.jsx:37-51](frontend/src/pages/ProyectosPage.jsx#L37-L51) (con aliases: `TERMINADO/FINALIZADO/HECHO` → `CERRADO`), [DashboardPage.jsx:160-174](frontend/src/pages/DashboardPage.jsx#L160-L174), [EquipoPage.jsx:36-38](frontend/src/pages/EquipoPage.jsx#L36-L38). En Prisma es un `String` libre con default `"ACTIVO"`.
- **Adjuntos a nivel proyecto**: el modelo `Proyecto` **ya tiene** relación `adjuntos Adjunto[]`. Falta solo la UI.
- **Plantillas**: ya existen los modelos `PlantillaProyecto` y `PlantillaTarea` en Prisma.
- **Cierre de modales**: sí lo tienen [ModalConfiguracionAgenda.jsx:226](frontend/src/components/ModalConfiguracionAgenda.jsx#L226), [ModalEvento.jsx:392](frontend/src/components/ModalEvento.jsx#L392), [ModalImportar.jsx:308](frontend/src/components/ModalImportar.jsx#L308). No lo tienen los modales embebidos en páginas. **Ninguno cierra con ESC.**

---

## 4. Backlog completo

Origen: `tareas_generadas.json` (19 tareas, sin trackear en git) **+ el bloc de notas del usuario** (2026-08-07), que es la fuente más completa y detallada. La columna **JSON** indica el `numeroActividad` equivalente cuando existe.

### 4.1 GENERAL (transversal)

| ID | Tarea | JSON | Notas |
|---|---|---|---|
| G1 | Mejorar diseño del scrollbar | 1 | Ya hay `::-webkit-scrollbar` global en [index.css:96-100](frontend/src/index.css#L96-L100). Hay scrollbars sueltos inline en [KanbanView.jsx:259](frontend/src/components/KanbanView.jsx#L259), [TaskComments.jsx:92](frontend/src/components/TaskComments.jsx#L92), [ProyectoDetallePage.jsx:664](frontend/src/pages/ProyectoDetallePage.jsx#L664). Unificar y verificar la clase `no-scrollbar` usada en [ProyectosPage.jsx:966](frontend/src/pages/ProyectosPage.jsx#L966). |
| G2 | Tooltips en botones de solo icono | 2 | Solo [Layout.jsx](frontend/src/components/Layout.jsx) tiene `title`/`aria-label`. El resto no. Crear el primitivo en Bloque 0 y **aplicarlo módulo por módulo** conforme se toque cada uno. |
| G3 | Al abrir una página nueva, mostrar el inicio de esa página | 3 | **Aclarado por el usuario:** es un bug de scroll. Si haces scroll en Tareas y navegas a Proyectos, la página nueva aparece ya desplazada — hereda el scroll anterior. Solución: componente `ScrollToTop` que resetea el scroll en cada cambio de ruta. **No** se refiere al redirect `/` → `/dashboard` (eso ya funciona). |
| G4 | Avatares: usar la imagen y arreglar el contenedor | 4 | **Aclarado:** [UserAvatar.jsx](frontend/src/components/UserAvatar.jsx) ya soporta foto, pero (a) hay secciones/usuarios donde no se ve, y (b) el contenedor tiene color de fondo variable (blanco, naranja, etc.) que se transparenta con PNG y **se ve mal, sobre todo en naranja**. Solución: fondo neutro/transparente cuando hay imagen, y auditar dónde no se está pasando `fotoPerfilUrl`. |
| G5 | Migrar todos los componentes a shadcn | 5 | Ver **propuesta completa en sección 8**. Es el bloque habilitador. |
| G6 | Máximo un modal; después de un modal, popovers | 6 | Nada de modales anidados. El segundo nivel siempre popover/dropdown. Se resuelve estructuralmente con los primitivos de shadcn. |
| G7 | Cerrar cualquier modal con click fuera y con ESC | 17 | **Aclarado:** hoy solo se cierra con la "X". Debe cerrarse tocando fuera del contenedor **y** con ESC. El `Dialog` de shadcn/Radix lo trae de fábrica → se resuelve de raíz en Bloque 0. |

### 4.2 INICIO (Dashboard, vista admin)

**Gantt general del proyecto**

| ID | Tarea | JSON |
|---|---|---|
| D1 | Agregar dropdown al gantt general | 7 |
| D2 | Arreglar las fechas — **aclarado: se ven amontonadas, hay que cambiar el diseño** de la escala temporal | 8 |
| D3 | Al seleccionar un proyecto, mostrar solo ese proyecto | 9 |
| D4 | Plantear qué se puede mostrar en el gantt general: qué actividades se hicieron al mes y en qué mes | — |

> D4 es una tarea de **propuesta**, no de código. Entregar opciones al usuario antes de implementar.

**Quitar secciones del Inicio**

| ID | Tarea |
|---|---|
| D5 | ✅ Quitar "Calendario de tareas" — *hecho el 2026-08-07* |
| D6 | ✅ Quitar "Top productividad" — *hecho el 2026-08-07 junto con M2* |
| D7 | ✅ Quitar "Flujo reciente" — *hecho el 2026-08-07* |
| D8 | Quitar la parte de equipo del inicio |

**Progreso de proyectos**

| ID | Tarea | JSON |
|---|---|---|
| D9 | ✅ Cambiar la vista a tabla — *hecho el 2026-08-07* | 10 |
| D10 | ✅ Mostrar proyectos activos y sin terminar — *hecho el 2026-08-07; filtro "En curso" por defecto* | — |
| D11 | ✅ Agregar filtros y paginación — *hecho el 2026-08-07* | — |

**Actividad de equipo**

| ID | Tarea |
|---|---|
| D12 | Ponerlo como prioridad (posición destacada) |
| D13 | Minimizarlo y hacerlo expandible |

**Cards de progreso**

| ID | Tarea |
|---|---|
| D14 | ✅ Dejar solo: proyectos, tareas y pendientes — *hecho el 2026-08-07, además como texto plano sin caja* |

**Vista**

| ID | Tarea |
|---|---|
| D15 | Dejar una sola vista con selector de cuál de las 3 mostrar; por defecto, **actividades de equipo** |

### 4.3 PROYECTOS (listado)

| ID | Tarea | JSON |
|---|---|---|
| P1 | Agregar paginación | 11 |
| P2 | Filtros de búsqueda | — |
| P3 | Archivar proyectos **y quitar la opción de eliminar** | 12 |
| P4 | Quitar el contador de cuántas tareas tiene el proyecto | — |
| P8 | Botón de 3 puntitos con: archivar, editar, agregar documentos (redirige a página para cargarlos), eliminar, activar/desactivar | — |
| P9 | ⚠️ "solo dejar el botón de eliminar" — **contradice P3 y P8**, ver sección 6 | — |
| P10 | Reemplazar "ver más tareas" por paginación | — |

**Crear proyecto**

| ID | Tarea | JSON |
|---|---|---|
| P5 | Quitar la opción de proyecto "cerrado" | — |
| P6 | Cambiar "en pausa" por "inactivo" y el dropdown por un **switch** | — |
| P7 | Convertir el flujo en pasos: **1)** nombre y descripción → **2)** responsables → **3)** lo opcional (activo, documentos, plantilla) | 13 |

> **Aclarado (P3/D10):** archivar sirve para proyectos que por ahora no están contemplados o se cancelaron, pero podrían retomarse en el futuro. No es lo mismo que "terminado".

### 4.4 DETALLE DEL PROYECTO

| ID | Tarea | JSON |
|---|---|---|
| DP1 | Agregar apartado para subir documentos | 14 |
| DP2 | Cambiar las plantillas a un **módulo independiente** | — |
| DP3 | Quitar "mi progreso" al admin si no está asignado al proyecto | — |
| DP4 | Quitar los nombres de los botones importar/exportar y cambiar los iconos | — |
| DP5 | Dejar solo las cards de progreso general y de usuario, y cambiar su diseño | — |
| DP6 | Quitar el contenedor de filtros de tareas y agruparlos en un solo botón | — |
| DP7 | Cambiar el filtro de fecha de modal a **popover** | — |
| DP8 | Agregar paginación y buscador al gantt de tareas; poner color al tablero | 15 |
| DP9 | El mes se debe mover con el scroll (encabezado sticky) | — |
| DP10 | Al dar click a una tarea del kanban, mandar a la fecha | — |
| DP11 | Agregar el texto "opcional" a los campos que lo sean | — |
| DP12 | Reemplazar el componente de "asignado a" por un **multiselect con buscador** | — |
| DP13 | Quitar la parte de "lo agregaste tú" | — |
| DP14 | Todo lo que sea opcional, dejarlo al final del formulario | — |

> **Aclarado (DP1):** hoy los documentos se suben dentro de la vista de lista de actividades. Se quiere un **apartado propio de documentos** dentro del proyecto, con subida al crear el proyecto y también después de creado.

### 4.5 MI AGENDA

| ID | Tarea | JSON |
|---|---|---|
| A1 | Arreglar el diseño principal: que no haga scroll horizontal | 16 |
| A2 | Quitar "conectar con Google" y asignarlo a Diego | — |
| A3 | Quitar el botón de invitaciones | — |
| A4 | Arreglar el scroll de los modales | — |
| A5 | Cerrar modales con click fuera y con ESC (ver G7) | 17 |
| A6 | Distribuir bien los elementos | — |
| A7 | ⚠️ Paginación después de 10 miembros y dividir el proceso en 3 pasos — ver sección 6 | — |

### 4.6 COMUNIDAD

| ID | Tarea | JSON |
|---|---|---|
| C1 | Quitar la página de Comunidad y convertirla en un **filtro de miembros dentro del módulo de proyectos**, solo para admin | 18 |

> "Comunidad" es la etiqueta del menú lateral que apunta a `/equipo`: [Layout.jsx:44](frontend/src/components/Layout.jsx#L44) (`labelKey: 'community'`), traducción en [PreferencesContext.jsx:14](frontend/src/context/PreferencesContext.jsx#L14). La página es [EquipoPage.jsx](frontend/src/pages/EquipoPage.jsx).

### 4.7 MIEMBROS

| ID | Tarea | JSON |
|---|---|---|
| M1 | Agregar filtros | 19 |
| M2 | ✅ Quitar la actividad del usuario — *hecho el 2026-08-07*. Ojo: quedaron **claves de traducción huérfanas** (`usersActivity*`, `usersViewActivity`, `dashboardTopProductivity`, `dashboardPerWeek`). Se dejaron a propósito: borrarlas no aporta y arriesga tumbar alguna que siga en uso. | — |

---

## 5. Orden de ejecución

Agrupado por **archivo y dependencia**, no por módulo — el usuario pidió explícitamente no repetir modificaciones sobre los mismos módulos o el mismo diseño.

### 🔵 Bloque 0 — Base técnica ✅ *(hecho el 2026-08-07 — ver sección 7)*
`G5 (setup) · G7 · G6 · G1 · G3 · G4 · G2 (primitivo)`

1. Instalar shadcn: alias `@/`, `jsconfig.json`, deps, `init`, **puente de tokens** con las variables CSS actuales (ver sección 8).
2. Primitivos base. El `Dialog` de Radix trae **click-fuera + ESC + scroll interno de fábrica** → resuelve **G7, G6, A4, A5** de raíz en vez de parchear modal por modal.
3. Scrollbar global unificado (**G1**).
4. `ScrollToTop` en cambio de ruta (**G3**).
5. `UserAvatar`: fondo neutro con imagen + auditar dónde falta la foto (**G4**).
6. Primitivo `Tooltip` (**G2**) — se *aplica* en cada bloque posterior, no todo de una vez.

> **Por qué primero:** G2, G6, G7, D9, D11, DP6, DP7, DP12, P1, P6, P8, P10, A7 son literalmente primitivos de shadcn (Tooltip, Dialog, Popover, DropdownMenu, Select, Switch, Table, Command, Pagination). Hacerlos a mano y migrarlos después es trabajo doble.

### 🔵 Bloque 1 — Backend: modelo de estados y listados
`P5 · P6 · P3 · D10 · P1 · P2 · D11 · DP1`

1. **Unificar estados de proyecto** en un solo catálogo: `ACTIVO / INACTIVO / TERMINADO / ARCHIVADO`. Quitar `CERRADO`, renombrar `EN_PAUSA` → `INACTIVO`, agregar `TERMINADO` (lo marca el admin) y `ARCHIVADO`. Migración Prisma + backfill + actualizar los **tres** lugares del front donde está duplicado el catálogo.
2. Paginación y filtros en la API: proyectos, tareas, miembros (una sola pasada).
3. Endpoints de documentos a nivel proyecto (la relación `Adjunto ↔ Proyecto` ya existe).

> **Por qué antes que el front:** P3, P5, P6, P8, D10, D11, P1, P2, P10, DP8, A7 dependen de este modelo. Cambiarlo después obliga a rehacer UI.

### 🔵 Bloque 2 — Proyectos: listado y creación
`P1 · P2 · P3 · P4 · P8 · P10 · P5 · P6 · P7` + G2

Archivo principal: [ProyectosPage.jsx](frontend/src/pages/ProyectosPage.jsx). Orden interno: primero quitar (P4), luego listado (P1, P2, P10), luego menú de 3 puntos y archivar (P8, P3), al final el wizard de creación (P7, P5, P6).

### 🔵 Bloque 3 — Comunidad → filtro de miembros
`C1 · M1 · M2`

Aterriza dentro del módulo de proyectos, por eso va justo después del Bloque 2. Toca [EquipoPage.jsx](frontend/src/pages/EquipoPage.jsx), [Layout.jsx](frontend/src/components/Layout.jsx) (nav) y [App.jsx](frontend/src/App.jsx) (ruta).

### 🔵 Bloque 4 — Documentos y plantillas
`DP1 · DP2 · P7-paso3 · P8-"agregar documentos"`

Se hace en **una sola pasada** porque la subida de documentos aparece en tres puntos (crear proyecto, menú de 3 puntos, detalle del proyecto). Aquí también se saca plantillas a módulo independiente (DP2), que es el paso 3 del wizard.

### 🔵 Bloque 5 — Detalle del proyecto *(sin gantt)*
`DP3 · DP4 · DP5 · DP6 · DP7 · DP10 · DP11 · DP12 · DP13 · DP14`

Archivos: [ProyectoDetallePage.jsx](frontend/src/pages/ProyectoDetallePage.jsx) y [KanbanView.jsx](frontend/src/components/KanbanView.jsx).

### 🔵 Bloque 6 — Gantt completo *(todo de una vez)*
`D1 · D2 · D3 · D4 · DP8 · DP9`

**Crítico:** el gantt del dashboard y el del detalle son el **mismo componente** ([GanttView.jsx](frontend/src/components/GanttView.jsx)). Tocarlo dos veces es exactamente lo que el usuario pidió evitar. Todo el rediseño (escala de fechas amontonadas, dropdown, filtro por proyecto, paginación, buscador, color del tablero, mes sticky) va junto.

Nota técnica sobre D2: además del rediseño visual, revisar `getTaskDates` en [GanttView.jsx:69-77](frontend/src/components/GanttView.jsx#L69-L77) — construye `new Date()` sobre ISO UTC de Prisma, lo que puede dar desfase de un día en hora local.

### 🔵 Bloque 7 — Inicio / Dashboard
`D5 · D6 · D7 · D8 · D14 · D15 · D12 · D13 · D9 · D10 · D11`

Archivo: [DashboardPage.jsx](frontend/src/pages/DashboardPage.jsx) (1884 líneas). **Quitar secciones primero** (D5–D8) — achica el archivo y facilita todo lo demás. Luego cards (D14), vista única (D15), actividad de equipo (D12, D13) y al final progreso de proyectos en tabla (D9, D10, D11). El gantt general ya quedó resuelto en el Bloque 6.

### 🔵 Bloque 8 — Mi Agenda
`A1 · A6 · A2 · A3 · A7` *(A4 y A5 ya resueltos en Bloque 0)*

Archivo: [AgendaPage.jsx](frontend/src/pages/AgendaPage.jsx) (2154 líneas). Ir con cuidado.

---

## 5-ter. Estados de proyecto — cómo quedó

**Catálogo:** `ACTIVO` · `INACTIVO` · `TERMINADO` · `ARCHIVADO`. Definido en **dos** archivos que hay que mantener sincronizados:
[backend/src/utils/estados.utils.js](backend/src/utils/estados.utils.js) y [frontend/src/utils/estadosProyecto.js](frontend/src/utils/estadosProyecto.js).

**Nombres viejos:** `EN_PAUSA/PAUSA/PAUSADO/PENDIENTE → INACTIVO` y `CERRADO/FINALIZADO/HECHO → TERMINADO`. Los alias se dejaron **a propósito y de forma permanente**: protegen contra registros sin migrar y contra clientes que no se han recargado.

> ⚠️ **`CERRADO` no era solo una etiqueta.** El backend lo usaba para *filtrar* en tres consultas: [agenda.controller.js:221](backend/src/controllers/agenda.controller.js#L221) y [:680](backend/src/controllers/agenda.controller.js#L680) (ocupación de la gente) y [stats.controller.js:192](backend/src/controllers/stats.controller.js#L192) (números del inicio). Se cambiaron a `notIn: ESTADOS_PROYECTO_OCULTOS`, que incluye los nombres nuevos **y** los viejos. Si solo se hubiera renombrado la etiqueta, esos filtros habrían dejado de filtrar en silencio y los proyectos terminados habrían empezado a aparecer en la agenda de todos.

**Flujo de "terminado" (definido por el usuario):** un proyecto **no** se marca solo al llegar al 100%. Se le muestra al admin el distintivo *"Listo para revisión"* (`estaListoParaRevision`: 100% de tareas + al menos 1 tarea + estado `ACTIVO`) y él decide. Si luego hay cambios, puede reactivarlo.

**Validación:** el backend rechaza estados fuera del catálogo con 400. Antes aceptaba cualquier texto.

### ✅ Migración de datos aplicada

`20260807180000_normalizar_estados_proyecto` — se corrió con `prisma migrate deploy` **después** de publicar el código, que era el orden seguro (el frontend desplegado no conocía `INACTIVO` y los habría mostrado como "Activo").

Antes: 29 proyectos → 27 `ACTIVO`, 2 `EN_PAUSA`, 0 `CERRADO`.
Después: 29 proyectos → 27 `ACTIVO`, 2 `INACTIVO`. Sin pérdida de registros.

> Ojo para el futuro: **Vercel no aplica migraciones solo.** El `vercel-build` del backend es solo `prisma generate`. Cualquier migración hay que correrla a mano con `npx prisma migrate deploy` desde `backend/`.

### ⏳ Pendiente de este bloque

- **P8** aún no incluye "agregar documentos" en el menú de la tarjeta — eso llega con el Bloque 4.
- **D10** (que el Inicio muestre solo activos y sin terminar) es del Bloque 7; el modelo de datos que necesita ya está listo.

---

## 5-sexies. ⚠️ El corte del día estaba mal en producción

`getActividadMiembros` calculaba "hoy" con `setHours(0,0,0,0)`, que usa la zona del servidor. **Vercel corre en UTC y el `vercel.json` no define `TZ`**, así que el día iba de 00:00 a 23:59 UTC = de las **18:00 del día anterior a las 18:00** en hora de México.

Consecuencia real: **toda tarea cerrada después de las 6 de la tarde contaba como del día siguiente**. En una vista cuyo propósito es el progreso diario, eso la vuelve inservible.

Corregido con [fechas.utils.js](backend/src/utils/fechas.utils.js) (`rangoDiaMexico`), que fija el corte donde de verdad cambia el día: `00:00 México = 06:00 UTC`. Verificado con una tarea de las 19:00 hora de México — antes caía fuera del día, ahora cae dentro.

> El mismo error puede estar en otras partes que usan `setHours(0,0,0,0)` o `finDelDia()` para acotar "hoy". Al tocar `agenda.controller` o `usuarios.controller`, revisar si aplica y reusar `rangoDiaMexico`.

**Nuevo endpoint:** `GET /api/stats/actividad-equipo?fecha=YYYY-MM-DD` (solo admin), separado de `/stats/admin` para que cambiar de día no recalcule todo el tablero.

---

## 5-quinquies. El Gantt del Inicio — lo que de verdad pasaba

> ⚠️ **Corrección a una afirmación previa de este documento:** el Gantt del Inicio y el del detalle de proyecto **NO comparten componente**. `GanttView.jsx` solo se usa en `ProyectoDetallePage`; el Inicio tiene su propio `ProjectTimeline` dentro de `DashboardPage.jsx`. Se pueden trabajar por separado.

**El diagnóstico de "fechas amontonadas" no era el obvio.** Las etiquetas de mes tenían espacio de sobra (rango real de 71 días ≈ 3 meses, ~367 px por mes). Lo que se encimaba eran **las dos etiquetas de fecha de cada barra**: se posicionaban en `left: offset` y `left: offset + ancho − 44px`, así que con la barra típica (~62 px) quedaban una encima de la otra. Ahora hay **una sola etiqueta después de la barra**.

**Los datos son la otra mitad del problema:** 15 de 29 proyectos **no tienen fecha de fin**. `getProjectRange` ahora resuelve el fin en **tres niveles**, y solo marca el último:

| `origenFin` | De dónde sale | Cómo se dibuja |
|---|---|---|
| `real` | `fechaFin` capturada | barra normal |
| `deducida` | último `completadoEn` de sus tareas | barra normal + nota "según último cierre" |
| `estimada` | nada; se inventan 7 días | **barra rayada** + "estimado" |

El backend expone `ultimaTareaCompletadaEn` en `GET /api/proyectos` (se calcula del array de tareas que ya cargaba, sin consulta extra). Con los datos al 2026-08-07: 14 reales, **4 deducidas** (Dafne pasó de 7 días inventados a 70 reales; ServMaq24 a 67; EREN a 29) y 11 siguen estimadas por no tener ninguna tarea cerrada con fecha.

> Al reescribir `ProjectTimeline` se perdieron los avatares de miembros y el contador de tareas de la columna izquierda. El usuario pidió **devolver solo los avatares** (ahora vía `UserAvatar`, así que muestran foto de perfil; antes dibujaban la inicial a mano). El contador de tareas se dejó fuera a propósito.

**Zona horaria en el conteo mensual:** la columna `"completadoEn"` es `timestamp without time zone` en UTC. Agrupar por mes sin ajustar movía **23 tareas entre junio y julio**. La consulta resta `interval '6 hours'` antes de truncar, siguiendo el `OFFSET_MEXICO_MS` que ya usaba el resto del código.

**104 tareas terminadas no tienen fecha de cierre** y no se pueden ubicar en ningún mes. Se devuelven aparte en `actividadPorMes.sinFecha` y la vista lo dice, en vez de repartirlas o inventarles fecha.

---

## 5-quater. Paginación y filtros en la API

Utilidad compartida: [backend/src/utils/paginacion.utils.js](backend/src/utils/paginacion.utils.js).

> **Regla de oro: si la petición no manda `page` ni `limit`, la respuesta sale completa y SIN el campo `meta`, exactamente como antes.** Es lo que permite desplegar esto sin tocar el frontend ya publicado. Al adoptar la paginación en una pantalla, hay que empezar a leer `meta`.

| Endpoint | Filtros | Límite por defecto |
|---|---|---|
| `GET /api/proyectos` | `q` (nombre, descripción) · `estado` (acepta nombres viejos) | 20 |
| `GET /api/proyectos/:id/tareas` | `q` (título, descripción) · `estado` · `prioridad` | 25 |
| `GET /api/usuarios` | `q` (nombre, email) · `area` · `rol` · `estado` | 10 |

Forma de `meta`: `{ page, limit, total, totalPages, hasNext, hasPrev }`. El `limit` se topa en 100.

**Detalles que no son obvios:**
- **Se pagina en memoria a propósito.** El orden de proyectos y tareas depende de valores que se calculan *después* de la consulta (progreso, rango de estado), así que cortar en la base daría páginas mal armadas. Los *filtros* sí bajan a la consulta, que es lo que reduce el volumen.
- En `tareas`, los filtros solo recortan la lista `tareas`. Los contadores de `progreso` salen de otra consulta sin filtrar y **deben seguir así**, o el porcentaje del proyecto cambiaría al buscar.
- En `usuarios` hay una **caché de 30 s** de la lista completa. Solo se usa y se rellena cuando no hay filtros; guardar un resultado filtrado dejaría datos incompletos para la siguiente petición sin filtros.

Pruebas: `scratchpad/probar-paginacion.mjs` (22 casos de la utilidad) y `scratchpad/probar-endpoints.mjs` (14 casos contra la base real, incluida la compatibilidad hacia atrás).

---

## 5-bis. Bugs preexistentes encontrados de paso

| Archivo | Problema | Estado |
|---|---|---|
| `DashboardPage.jsx` | Usaba `tareasService` en los manejadores de "mover +1 / +2 días / elegir cantidad" pero **nunca lo importaba**, así que esos botones reventaban con `tareasService is not defined` en vez de mover nada. ESLint lo marcaba como `no-undef` desde antes de este trabajo. | ✅ **Corregido el 2026-08-07** (commit `a8dea05`) |

---

## 6. Dudas abiertas

Anotadas, no bloqueantes. El usuario pidió: *"si no entiendes aún qué hacer en una actividad, no importa, solo anótala y conforme vayamos haciéndolas te explico más a detalle."*

| # | Duda | Bloque |
|---|---|---|
| 1 | **P3 vs P9** — P3 dice "archivar y **quitar** la opción de eliminar"; P9 dice "solo dejar el botón de eliminar"; P8 incluye "eliminar" en el menú de 3 puntos. Son tres instrucciones incompatibles. | 2 |
| 2 | **A7** — "paginación después de 10 miembros y dividir el proceso en 3 pasos" está bajo *Mi Agenda* pero habla de miembros. ¿Es el flujo de invitar miembros a un evento? | 8 |
| 3 | **A2** — "quitar conectar con Google y asignarlo a Diego": ¿nosotros solo quitamos el botón y la integración queda a cargo de Diego? | 8 |
| 4 | **D1** — ¿qué dropdown específico va en el gantt general? (¿zoom día/semana/mes, agrupación, selector de proyecto?) | 6 |
| 5 | **D4** — es una tarea de propuesta. Hay que presentarle opciones al usuario antes de codificar. | 6 |
| 6 | **G5** — decidir alcance de shadcn: migración total o incremental (ver sección 8). | 0 |

---

## 7. Registro de avance

> **Regla:** cada vez que se complete algo, agregar una fila aquí **y** actualizar `pending-tasks-backlog.md` en la memoria del proyecto. Requisito explícito del usuario para no perder el hilo al cambiar de cuenta.

| Fecha | Bloque / ID | Qué se hizo | Archivos |
|---|---|---|---|
| 2026-08-07 | — | Análisis de `tareas_generadas.json` contra el código. Creado este documento. | `CONTEXTO_TRABAJO.md` |
| 2026-08-07 | — | El usuario entregó el bloc de notas completo (~50 tareas) y aclaró #3, #4, #5, #8, #12, #14, #17. Backlog reescrito y reordenado en 9 bloques. | `CONTEXTO_TRABAJO.md` |
| 2026-08-07 | **0 · G5** | ✅ **shadcn instalado.** Deps (`cva`, `clsx`, `tailwind-merge`, `tailwindcss-animate`), alias `@/`, `jsconfig.json`, `components.json`, `cn()`, **16 primitivos**, `tailwind.config` extendido y **puente de tokens** en `index.css`. Quitada la dep muerta `@tailwindcss/vite`. | `components.json`, `jsconfig.json`, `vite.config.js`, `tailwind.config.js`, `src/lib/utils.js`, `src/components/ui/*` (16), `src/index.css`, `package.json` |
| 2026-08-07 | **0 · G1** | ✅ **Scrollbar rediseñado.** Antes el thumb era `--color-surface-3` (casi invisible en claro) y en hover saltaba a `--color-text-dim` (demasiado oscuro). Ahora usa `--color-scrollbar` / `-hover` por tema, con `background-clip: content-box` y soporte Firefox. Quitados 3 scrollbars inline duplicados. **Definida la clase `.no-scrollbar`, que se usaba en `ProyectosPage` sin existir** (bug latente). | `src/index.css`, `KanbanView.jsx`, `TaskComments.jsx`, `ProyectoDetallePage.jsx` |
| 2026-08-07 | **0 · G3** | ✅ **Scroll heredado arreglado.** `useEffect` sobre `location.pathname` que resetea el contenedor del `<main>`. Clave: **el scroll no lo lleva `window`** sino el `div.flex-1.overflow-y-auto` del Layout, por eso `window.scrollTo` solo no bastaba. | `Layout.jsx` |
| 2026-08-07 | **0 · G4** | ✅ **Avatares.** Causa raíz: `UserAvatar` solo se usaba en `EquipoPage`; los otros 13 lugares dibujaban iniciales a mano con fondos de color fijos (incl. el **gradiente naranja** del sidebar). `UserAvatar` ahora usa fondo neutro cuando hay foto y cae a iniciales si la URL está rota (`onError`). Migrados 9 sitios. | `UserAvatar.jsx`, `Layout.jsx` (×2), `KanbanView.jsx`, `TaskComments.jsx`, `ProjectActivityLog.jsx`, `UsuariosPage.jsx` (×2), `ModalEvento.jsx`, `ProyectosPage.jsx` |
| 2026-08-07 | **0 · barra superior → sidebar** | ✅ **Se eliminó la barra superior en escritorio** y sus elementos bajaron a la barra lateral: el **buscador** debajo de `Colapsar` (colapsado queda solo la lupa, que expande el menú) y **notificaciones + modo oscuro** en el pie, junto a la foto y Salir. **El selector de idioma se quitó por completo** (pedido del usuario; `setLanguage` sigue en `PreferencesContext`, solo dejó de tener control en la UI). La foto del encabezado se borró por duplicada — la del sidebar ya lleva a `/perfil`. `NotificationCenter` recibió la prop **`enSidebar`**: fondo transparente e iconos en blanco (el sidebar es oscuro en ambos temas) y el panel abre **hacia arriba y a la derecha** (`bottom`/`left` en vez de `top`/`right`), porque el botón queda en la esquina inferior izquierda. En móvil se conserva una barra delgada con el botón de menú y la campana; se monta **una sola instancia** de `NotificationCenter` según `isDesktop`, para no duplicar el polling de 15s. **La página gana ~70px de alto en todas las pantallas.** ⚠️ El buscador sigue siendo decorativo: no tiene `onChange` ni handler de Ctrl+K, igual que antes de moverlo. **Ajuste posterior:** notificaciones y tema se dibujan como **filas del menú** (mismo alto, icono y hover que Inicio o Proyectos; el contador de avisos pasa a la derecha de la fila) y viven **dentro del `<nav>` desplazable**, no en el pie fijo. En el pie robaban ~110px de alto y obligaban a desplazar para llegar a Inicio y Proyectos — el usuario fue explícito: las opciones de navegación importan más que estas dos. El pie volvió a ser solo la foto/nombre y Salir. | `Layout.jsx`, `NotificationCenter.jsx`, `PreferencesContext.jsx` (`openMenu` ×2) |
| 2026-08-07 | **Bloque 5 · notificaciones recortadas** | ✅ **El panel de notificaciones se cortaba.** Al bajar la campana al menú lateral quedó dentro del `<nav>`, que tiene `overflow-y: auto` — y eso **recorta también en horizontal**: un panel de 380px dentro de una barra de 280px salía cortado y aparecía una barra de desplazamiento horizontal en el menú. Pasó a **Popover de shadcn**: al ir por portal, ningún contenedor lo recorta, y se coloca solo (a la derecha de la barra en escritorio, debajo del botón en móvil). Se retiró el manejador manual de clic fuera: además de sobrar, **habría cerrado el panel al pulsar dentro**, porque al portarse el contenido ya no cuelga del `ref` que ese manejador vigilaba. | `NotificationCenter.jsx` |
| 2026-08-07 | **Bloque 5 · Comunidad dentro de Proyectos (M1)** | ✅ **La página "Comunidad" desapareció del menú** y su contenido vive ahora como una **pestaña dentro de Proyectos, solo para el admin**. `pages/EquipoPage.jsx` pasó a `components/PanelMiembros.jsx`: se conserva el contenido tal cual —un desplegable por proyecto con las tarjetas de su equipo, elegido por el usuario frente a una lista plana con filtro— y solo se le quitó la envoltura de página (título, ancho máximo, relleno propio), que ahora pone Proyectos. Se retiraron la ruta `/equipo`, su carga diferida en `App.jsx` y la entrada del menú lateral. Sin ser admin no hay pestañas: se entra directo a la lista. ⚠️ **Consecuencia**: los miembros ya no pueden ver el equipo de sus proyectos desde ningún sitio; antes esa página se lo mostraba. Confirmado con el usuario que es admin-only. **Segunda pasada — rendimiento**: el usuario reportó que tardaba en cargar. Era el **N+1** heredado de la página original: pedía la lista y acto seguido el equipo de los 29 proyectos, sin pintar nada hasta que llegaba el último. Ahora es **una sola petición** (la lista, vía SWR, así que además queda cacheada) y **el equipo de cada proyecto se pide la primera vez que se despliega**. El conteo del encabezado sale de `proyecto.miembros` que ya viene en la lista, para no tener que pedir el equipo solo para mostrar un número. Añadida **paginación de 10** y los proyectos **arrancan plegados** (antes `useState(true)`). La petición se lanza desde el propio clic y no desde un efecto que observe `open`: sale una sola vez y evita la cascada de renders que marca el lint. | `PanelMiembros.jsx` (movido), `ProyectosPage.jsx`, `App.jsx`, `Layout.jsx` |
| 2026-08-07 | **Bloque 4 · alta de evento por pasos (A5/A7)** | ✅ **`ModalEvento` pasó a asistente de 3 pasos**, agrupación elegida por el usuario: *Lo básico* (título, categoría, descripción, fecha, hora) → *Dónde* (modalidad, ubicación o enlace, notas, enlace remoto) → *Participantes* (colaboración, miembros y documentos). Los **documentos se movieron desde el medio al final** del paso 3, por ser lo más opcional. Igual que en proyectos, **al editar no hay pasos**: se ve todo de corrido (`conPasos = !evento`). **Lista de invitados**: primero se paginó de 10 en 10, pero al verlo el usuario pidió no saturar el paso, así que se sustituyó por **`SelectorMultiple` con buscador** — un campo plegado en vez de una fila con foto y correo por persona. De 85 líneas a 16, y la paginación dejó de hacer falta. También se **compactaron los dos conmutadores** (`Todo el equipo / Miembros específicos` y el bloque de Colaboración): medían casi el doble que un campo normal, con sombras de color y rellenos de 1.5rem; ahora 44px de alto fijo y marcos de 1rem. Las **fichas de invitados elegidos van en una sola fila con desplazamiento horizontal** (`flexWrap: nowrap` + `overflowX: auto` + `flexShrink: 0` en cada ficha): envolviendo, cada cinco invitados añadían un renglón y el paso crecía hacia abajo sin control. **Segunda pasada tras verlo el usuario**: quedaban **dos ventanas emergentes más** dentro del modal — el calendario (`RangeDatePicker`) y el selector de hora (`TimeRangePicker`, que abría una capa a pantalla completa con su propio "Cerrar/Confirmar"). Los dos pasaron a **Popover de shadcn** (el usuario lo pidió expresamente tras verlos en línea): flotan sobre el formulario en vez de empujarlo. El de horas se reescribió de 113 a ~45 líneas. 📌 **Nota técnica**: el Popover de Radix **sí funciona dentro del Dialog de Radix** — ambos comparten la pila de `DismissableLayer` — a diferencia de un portal propio, que sí se queda sin recibir clics. Por eso `SelectorMultiple` y `FiltrosTareas` siguen con panel absoluto y estos usan Popover. `PopoverContent` lleva `z-[1500]` para pasar por encima del `z-[1401]` del modal. También se bajó el tamaño de los elementos, que estaban por encima del resto del sistema (título 1rem con 0.85/1.25rem de relleno, botones de 1rem y borde de 1.25rem, papelera de 56px), y los botones del pie pasaron al **`Button` de shadcn**. **Tercera pasada — filas y alto**: cada fila agrupa ahora controles del **mismo alto**. En el paso 1, fecha y hora comparten fila (los dos son disparadores compactos; apilados dejaban media ventana vacía). En el paso 2, el **enlace remoto sube a la fila de ubicación** —ambos de una línea— y las **notas logísticas quedan solas a lo ancho**, que es el único campo de varias líneas del paso. El modal usa `height: min(680px, 90vh)` mientras se crea, para que **no cambie de tamaño entre pasos**; al editar se deja crecer con el contenido. ⚠️ Al envolver las secciones hubo que meterlas en fragmentos `<>…</>`: cada paso agrupa varios elementos hermanos y sin envoltorio da *"Adjacent JSX elements must be wrapped"*. | `ModalEvento.jsx`, `PreferencesContext.jsx` (5 claves ×2 idiomas) |
| 2026-08-07 | **Bloque 4 · Mi Agenda, desplazamiento horizontal (A1)** | ✅ **Quitado el scroll horizontal de la página.** Tres causas en la cabecera: el `<h1>` reservaba **380px fijos** con `whiteSpace: nowrap`; la fila tenía `flexWrap: nowrap` en escritorio, así que nunca bajaba de línea; y los dos grupos llevaban `flexShrink: 0`, con lo que nada podía encogerse. Sumando título + navegación + Google + correo + ajustes + 3 vistas + Nuevo, el contenido empujaba la página hacia fuera. **Corrección del usuario**: envolver tampoco valía — prefiere perder margen antes que ver la cabecera partirse en dos al cambiar de mes. Solución final: en escritorio la fila **no envuelve**; el **título se encoge y se recorta con puntos suspensivos** (los botones no pueden encogerse sin romperse, así que quien cede es el título), se apretaron los espacios y **se quitó el `padding: 2rem` propio de la agenda**, que se sumaba al del contenedor de la página y era justo lo que dejaba a la cabecera sin sitio. En móvil sí envuelve. De paso se quitó el `.toUpperCase()` del mes ("AGOSTO DE 2026") por `first-letter:uppercase`, según la regla de tipografía. | `AgendaPage.jsx` |
| 2026-08-07 | **Bloque 3 · ventana de tarea y Kanban (DP11/DP12/DP14/DP15)** | ✅ **Ventana de tarea reordenada**: primero lo necesario (título, responsables, estado, prioridad, duración) y **lo opcional al final**, tras una línea divisoria — antes descripción y número de actividad se cruzaban entre el título y los responsables. Nuevo `EtiquetaCampo` que marca los opcionales con "· opcional", incluido el bloque de documentos. **"Asignado a" pasó a `SelectorMultiple` con buscador**: eran todos los nombres del equipo como botones a la vista y con un equipo grande ocupaba media ventana. **El campo de fecha dejó de abrir una ventana**: usaba `RangeDatePicker` (modal sobre modal), que además hacía que los desplegables nativos del formulario —prioridad, estado— se dibujaran por encima del calendario. Ahora usa `SelectorRangoFechas`; `RangeDatePicker` ya no se usa en esta pantalla (sigue en Agenda). 📌 **Aclaración del usuario: cada calendario tiene su caso, no se aplica lo mismo a todos.** En el **alta de proyecto** pidió que estuviera *siempre desplegado*; en la **ventana de tarea**, plegado y que se abra al pulsarlo (pero sin ventana emergente). De ahí la prop **`plegable`**: cerrado muestra el rango elegido con su icono y una flecha, y se despliega en línea, empujando el contenido — no flotando, porque el cuerpo del modal desplaza y un panel absoluto se recortaría. **Kanban: "Ver más" reemplazado por paginación** de 10 por columna; al arrastrar una tarjeta a otra columna se salta a la página donde cae, que es lo que antes hacía subir el tope. | `ProyectoDetallePage.jsx`, `KanbanView.jsx`, `PreferencesContext.jsx` (`fieldOptional` ×2) |
| 2026-08-07 | **Bloque 3 · gantt del proyecto (DP8 parcial)** | ✅ **Un mes a la vez en vez de todos de corrido.** Antes el eje abarcaba de la primera a la última tarea del proyecto, así que con medio año de trabajo la tabla se iba varias pantallas a la derecha. Ahora `range` es el mes visible, con **navegación ‹ mes › y botón Hoy** en su propia barra; desapareció la fila que dibujaba una cabecera por mes. Arranca en el mes actual si el proyecto sigue vivo, o en el de la primera tarea si ya terminó. `getPosition` **recorta a [0,100]**: una tarea que empieza antes o acaba después se dibuja pegada al borde. Las tareas de otros meses **conservan su fila** —para que la paginación no cambie de contenido al navegar— pero en vez de barra muestran a qué mes pertenecen. **Paginación de 10 filas** al pie. Ancho de día de 42px a 26px (31 × 26 = 806px, cabe en escritorio sin desplazar). **Quitado el punto de color** que iba junto al nombre de cada tarea: llevaba el color del **área**, no del estado, y el azul de DESARROLLO era el mismo de "En progreso" en la leyenda, así que una tarea Hecha aparecía con punto azul y se leía como en progreso. El área ya va escrita en texto en la misma fila. También se cambió `capitalize` por `::first-letter` en el nombre del mes, aquí y en el calendario: en español el mes largo es "agosto de 2026" y `capitalize` lo dejaba como "Agosto De 2026". **Clic en la fila abre la tarea** (DP10, aclarado por el usuario: "cuando yo seleccione una, me mande al card de la tarea"). Se hace sobre la **fila entera**, no solo sobre la barra, porque en un mes donde la tarea no cae la barra ni se dibuja; con `role="button"`, `tabIndex` y Enter/Espacio. ⚠️ **Pendientes de DP8**: buscador propio del gantt y "poner color al tablero". | `GanttView.jsx` |
| 2026-08-07 | **Bloque 3 · paginación de la lista (DP15)** | ✅ **"Ver más tareas" reemplazado por paginación** en la vista de lista: 10 por página, con flechas, número de página y el rango sobre el total. Con el botón anterior la lista solo crecía, no había forma de volver atrás ni de saber por dónde ibas. De paso se quitó el `maxHeight: 70vh` con scroll propio del contenedor: con 10 tareas ya no crece sin fin, y los dos desplazamientos anidados se estorbaban. La página se recorta con `Math.min` en vez de reiniciarse con un efecto, así al filtrar queda en rango sola. ⚠️ **Sigue pendiente el `loadMore` del Kanban** (`KanbanView.jsx:287`), que es otro sitio distinto. | `ProyectoDetallePage.jsx` |
| 2026-08-07 | **Bloque 3 · documentos del proyecto (DP1)** | ✅ **Panel de documentos a la derecha de las tareas**, al estilo del panel de contexto de Claude que mostró el usuario. Reutiliza `TaskAttachments` con `type="proyectos"`, que ya sabía subir, listar y borrar; se le añadió la prop **`compacto`** (encabezado y botón apilados, sin el texto de ayuda largo) para que quepa en una columna de 320px. De paso su botón de subir dejó de ser `#0f172a` fijo — en modo oscuro era un botón negro sobre fondo negro — y el recuadro de ayuda pasó a variables de la paleta. **Solo se muestra en la vista de lista**: el Kanban y el gantt necesitan todo el ancho, y con la columna al lado las tres columnas del tablero y las barras del gantt quedaban estrujadas. En pantallas menores a `xl` baja debajo de la lista. | `ProyectoDetallePage.jsx`, `TaskAttachments.jsx`, `PreferencesContext.jsx` (`projectDocsHint` ×2) |
| 2026-08-07 | **Bloque 3 · correcciones del usuario** | 📌 Dos errores míos en la primera pasada: (1) **"Mi progreso"** — la regla final, tras dos vueltas con el usuario, depende del rol: **admin** lo ve solo si tiene tareas suyas en el proyecto (entra a supervisar proyectos que no trabaja y ahí un 0% no dice nada); **miembro** lo ve siempre, porque solo accede a proyectos en los que participa y ahí el 0% sí significa "estoy dentro y no he tomado nada". (2) Las dos barras seguían dentro de **tarjetas con recuadro**, cuando ya se había acordado texto plano como en el Inicio; ahora van sin caja, porcentaje grande a la izquierda y barra fina debajo, las dos en la misma franja. | `ProyectoDetallePage.jsx` |
| 2026-08-07 | **Bloque 3 · cabecera y tarjetas (DP2/DP3/DP4/DP13)** | ✅ **De 5 tarjetas de estadística a 2 de progreso** (`TarjetaProgreso`, con barra en vez de número suelto): pendientes, en marcha y hechas repetían lo que ya cuenta el Kanban columna a columna. **"Mi progreso" solo sale si tienes tareas asignadas ahí** — al admin que entra a supervisar le salía un 0% sin significado. **Importar y exportar se quedan en el menú** — se probaron como iconos sueltos y el usuario pidió devolverlos: tres botones seguidos junto a "Nueva Tarea" se veía recargado. Lo que sí cambió son sus **iconos**, ahora flechas de dirección (`ArrowDownToLine` / `ArrowUpFromLine`); antes ambos usaban `Download` y no se distinguían. **Quitado "La agregaste tú"** de la lista y de la ventana de tarea; cuando la creó otra persona sí se sigue diciendo "Asignó: Fulano". | `ProyectoDetallePage.jsx`, `PreferencesContext.jsx` (`projectOfTasksDone` ×2) |
| 2026-08-07 | **Bloque 3 · filtros de tareas (DP5/DP6)** | ✅ Componente **`FiltrosTareas`**: los tres filtros (fecha, prioridad, responsable) dejaron una franja fija de la pantalla y viven tras **un solo botón** con contador de filtros activos y acción de limpiar. **El filtro de fecha dejó de abrir una ventana modal** (`RangeDatePicker`) y usa el calendario en línea dentro del propio panel; `SelectorRangoFechas` ganó `conLeyenda` para ocultar la leyenda de ocupación, que en un filtro no significa nada. **Segunda pasada tras verlo el usuario**: el calendario abierto medía más que los otros dos filtros juntos y dejaba el panel larguísimo. Ahora **prioridad y responsable van primero** (los de uso diario) y **la fecha queda al final, plegada**, mostrando el rango elegido o "Cualquier fecha"; solo se despliega si se pulsa, o de entrada si ya venía filtrando por fecha. **Tercera pasada**: el calendario tampoco crece dentro del panel — sale a su **izquierda, apoyado en el borde inferior**, así que se abre hacia arriba. Desplegándolo hacia abajo el panel se salía de la pantalla, porque el botón de filtros vive en la parte alta de la página. `SelectorRangoFechas` ganó `sinMarco` para no dibujar caja dentro de caja. **Cuarta pasada — bug real del calendario**: la navegación de react-day-picker va en `position: absolute` pegada arriba a la derecha y el título del mes trae `font-size: large` en negrita, así que un mes largo ("septiembre 2026") se metía **debajo de las flechas**. Se corrigió en `index.css`: `padding-inline-end` en `.rdp-month_caption` para reservar el hueco de las flechas, tamaño y peso a la escala del sistema (0.95rem / 600, en vez de `bold`), y día de 2.25rem a 2.1rem (7 × 2.1rem = 235px, que caben en el panel con su relleno). **Quinta pasada — por qué no se aplicaba**: los ajustes anteriores no surtían efecto porque la hoja de react-day-picker se importa desde el componente y acaba **después** de `index.css` en el bundle (incluso en un chunk aparte, `TaskAttachments-*.css`); a igualdad de especificidad ganaba la librería. Solución: `SelectorRangoFechas` le pasa al `DayPicker` la clase **`calendario-crm`** y todas las reglas del CRM van calificadas con ella (`.rdp-root.calendario-crm`, `.calendario-crm .rdp-month_caption`…), que es 0-2-0 frente al 0-1-0 de la librería y gana sin depender del orden. **Regla: al sobrescribir estilos de una librería que importa su propio CSS, no basta con repetir su selector.** **Ajuste final**: el panel del calendario pasó a **340px** y la rejilla sí reparte el ancho disponible (`.rdp-month_grid { width: 100% }` + `.rdp-day { width: auto }`), así los días respiran cuando sobra espacio y se encogen en vez de desbordar cuando falta. El título del mes lleva `white-space: nowrap` y 5rem de hueco reservado para las flechas. | `FiltrosTareas.jsx` (nuevo), `SelectorRangoFechas.jsx`, `ProyectoDetallePage.jsx` |
| 2026-08-07 | **Bloque 2 · bug de disponibilidad** | ✅ **"Limpiar" borraba los días bloqueados del equipo.** El efecto que consulta la ocupación salía antes de tiempo cuando no había fecha de inicio (`if (ids.length === 0 || !form.fechaInicio) { setOcupados({}) }`), así que limpiar las fechas vaciaba `ocupados` y los días marcados no volvían — y de ahí venía el segundo síntoma que reportó el usuario, que al reelegir a un miembro tampoco aparecían. Ahora sin fecha se consulta desde el mes actual. Además la ventana de consulta es **siempre un año** desde el mes de inicio (antes se cortaba en `fechaFin`, y al navegar el calendario más allá los días salían sin marcar), y `fechaFin` dejó de ser dependencia del efecto. El calendario abre en el mes de la fecha de inicio (`defaultMonth`). | `ProyectosPage.jsx`, `SelectorRangoFechas.jsx` |
| 2026-08-07 | **Bloque 2 · ajustes del calendario y del modal** | ✅ El calendario **ya no se despliega**: se dibuja siempre, sin pulsar nada. Se le pasó el **idioma** (`date-fns/locale`) — salía con los días en inglés porque `DayPicker` sin `locale` cae en `en-US`. `Modal` acepta ahora una prop **`height`**: el alta de proyecto la fija en `min(720px, 90vh)` para que la ventana no crezca y encoja al pasar de paso, moviendo los botones de sitio; al editar se deja crecer con el contenido, como antes. CSS del calendario revisado contra la hoja real de react-day-picker 10 (`.rdp-root`, `.rdp-day_button`, `--rdp-*`); se quitó `--rdp-font-family`, que no existe en esa versión. | `SelectorRangoFechas.jsx`, `Modal.jsx`, `ProyectosPage.jsx`, `index.css` |
| 2026-08-07 | **Bloque 2 · un solo calendario** | ✅ Los **dos selectores de fecha se unieron en uno de rango** (`SelectorRangoFechas`) y **se quitó la lista "Calendario de responsables"**: la misma información se ve ahora sobre los propios días — tachados los bloqueados de verdad, en ámbar los que ya tienen otro proyecto (se avisa pero **no** se bloquea, solaparse es decisión del admin). Elegir un solo día deja la fecha de fin vacía. Construido sobre **`react-day-picker` en modo rango**, que ya era dependencia del proyecto (`RangeDatePicker` de Agenda lo usa); **el calendario del CLI de shadcn no se instaló** porque su plantilla apunta a react-day-picker 8/9 y aquí está la 10, y bajar la versión rompería Agenda y el detalle de proyecto. Los estilos se ajustaron a la paleta con las variables `--rdp-*` en `index.css`. Se borraron `ProjectDatePicker` (~95 líneas), `formatFechaCorta` y `conflictosEnAreas`, ya sin uso. ⚠️ Al borrarlos, un script cortó por la primera línea `};` y se llevó código de más — las arrow functions internas terminan igual. Se detectó al instante con el lint (`Parsing error: return outside of function`) y se corrigió acotando por el comentario de sección. **Regla: no delimitar bloques por `};` a secas.** | `SelectorRangoFechas.jsx` (nuevo), `ProyectosPage.jsx`, `index.css`, `PreferencesContext.jsx` (4 claves ×2 idiomas) |
| 2026-08-07 | **Bloque 2 · selector plegable** | ✅ Componente **`SelectorMultiple`**: áreas y miembros dejaron de ser rejillas con todo a la vista y ahora se despliegan al pulsarlos. El botón resume lo elegido (hasta dos nombres y un contador). El de miembros trae buscador y agrupa por área; conserva el aviso *En proyecto* de quien ya está ocupado, como distintivo a la derecha, y **sigue sin bloquearlo** — es decisión del admin. El paso 2 pasó de más de una pantalla de alto a cuatro campos. **El panel va en `absolute`, no con el Popover de Radix**: vive dentro de la ventana modal (un Dialog de Radix) y un portal hermano se queda sin recibir clics; `ProjectDatePicker` de esta misma pantalla ya resolvía así lo mismo. Quedaron sin uso las claves `projectMemberSelected` y `projectNoMembers`. | `SelectorMultiple.jsx` (nuevo), `ProyectosPage.jsx`, `PreferencesContext.jsx` (3 claves ×2 idiomas) |
| 2026-08-07 | **Bloque 2 · P9 (alta por pasos)** | ✅ **El alta de proyecto pasó a asistente de 3 pasos**: *Lo básico* (plantilla, nombre, descripción) → *Responsables* (área, miembros, fechas y calendario de ocupación) → *Opcional* (estado activo/inactivo y documentos). **Decisión del usuario: la plantilla va en el paso 1**, no en el 3 como decía la nota original — rellena sola el área y la descripción, y para eso tiene que elegirse antes que ellas. Las fechas van en el paso 2 porque el calendario de ocupación depende de ellas y de quién esté seleccionado. **Al editar no hay pasos**: se ve todo de corrido (`conPasos = !proyecto`), un solo camino de render con `enPaso(n)` por sección. Validación por paso con aviso emergente en vez de `alert()`; al guardar se revalidan los tres, porque en modo edición nadie pasó por `avanzar`. El indicador de pasos deja volver atrás pero no saltar adelante. **De paso se borraron ~200 líneas muertas**: tres bloques duplicados de plantilla con `className="hidden"`, dos `{false && ...}` y un subidor de archivos oculto que `TaskAttachments` ya reemplazaba. | `ProyectosPage.jsx`, `PreferencesContext.jsx` (5 claves ×2 idiomas) |
| 2026-08-07 | **Bloque 2 · tarjeta compacta** | ✅ Los **3 puntitos subieron a la esquina superior derecha**, donde estaba la flecha `>`; la flecha se quitó porque toda la tarjeta ya lleva al proyecto. **Se eliminó el pie completo** (foto y nombre del responsable, y su línea divisoria) y se redujo el relleno. Las barras de progreso llevan `mt-auto` para quedar alineadas entre las tarjetas de una misma fila, papel que antes hacía el pie. | `ProyectosPage.jsx` |
| 2026-08-07 | **Bloque 2 · aclaraciones del usuario** | 📌 Confirmado en esta sesión: **el menú de la tarjeta se queda como está** (editar · terminar · reactivar · archivar · eliminar). La nota *"solo dejar el botón de eliminar"* del bloc queda **descartada**, igual que *"agregar activar/desactivar"*. Con esto se cierra la contradicción de la sección 6. **Ya estaban hechas de rondas anteriores**: quitar CERRADO, renombrar EN_PAUSA→INACTIVO y cambiar el desplegable de estado por switch. **Sigue pendiente** de esa lista: *"reemplazar ver más tareas por paginación"*, que no es del modal sino del **Kanban del detalle de proyecto** (`KanbanView.jsx`, botón `loadMore`), y *"agregar documentos"* en el menú, que depende de la vista de documentos dentro del proyecto (D14), aún sin construir. | — |
| 2026-08-07 | **0 · caché de datos (SWR)** | ✅ **`SWRConfig` global en `App.jsx`** (`keepPreviousData`, `dedupingInterval: 30s`, `revalidateOnFocus: false`) y migración de **Inicio** y **Proyectos** a `useSWR`. Antes cada entrada a una pantalla volvía a pedirlo todo desde cero y se quedaba en el esqueleto, aunque acabaras de estar ahí. Ahora al volver se pinta lo cacheado al instante y la actualización llega por detrás. La clave incluye todos los filtros, así que cada combinación se guarda por separado. `PageSkeleton` solo sale cuando no hay absolutamente nada (`isLoading && !data`). `projects` en `DashboardAdmin` va memorizado: `tablero?.projects || []` creaba un array nuevo en cada render e invalidaba los `useMemo` del gantt. **Pendiente**: Detalle de proyecto, Mi Agenda y Comunidad siguen sin caché. ⚠️ La lentitud también viene del backend: `proyectos.listar` trae **todos** los proyectos con todas sus tareas, calcula progreso en memoria y recién ahí pagina. | `App.jsx`, `DashboardPage.jsx`, `ProyectosPage.jsx` |
| 2026-08-07 | **0 · etiquetas sobre los controles** | ✅ Componente **`CampoFiltro`**: regla general del sistema, la etiqueta va **encima** del control y nunca a su lado. Aplicado a los filtros de Proyectos (buscar, estado, área), a la actividad de equipo y a la tabla de progreso del Inicio. La fila usa `items-end` para que todos los controles queden alineados por abajo aunque alguno no lleve etiqueta. | `CampoFiltro.jsx` (nuevo), `ProyectosPage.jsx`, `DashboardPage.jsx` |
| 2026-08-07 | **Bloque 2 · bug de archivar** | ✅ **Archivar dejaba el proyecto en la lista.** `handleCambiarEstado` solo cambiaba la etiqueta de estado en memoria, así que un proyecto recién archivado seguía visible en la vista general con el distintivo "Archivado". Ahora se calcula si con el nuevo estado sigue perteneciendo a la vista actual (`perteneceAVista`) y, si no, desaparece en el acto y se revalida — hacía falta revalidar porque el total y el corte de página cambian. Aplica igual a terminar o reactivar con un filtro de estado activo. | `ProyectosPage.jsx` |
| 2026-08-07 | **0 · tipografía (barrido global)** | ✅ **Escala de pesos aplicada a todo el frontend**: dentro de `<h1>`–`<h4>` → **600**, dentro de `<p>` → **400**, en cualquier otro sitio los 700/800/900 → **500**. Se eliminaron **todas** las mayúsculas forzadas (`uppercase`, `textTransform`, `.toUpperCase()` sobre textos traducidos) y el interletrado ancho que las acompañaba; el `tracking` negativo de los títulos se conserva. También bajaron a 500 `.btn-primary` y `.form-label` en `index.css`. Resultado: 0 residuos de `font-black`/`font-bold`/`uppercase`; quedan 30 `font-semibold`, 234 `font-medium`, 78 `font-normal`. **No se tocó `components/ui/**`**: son componentes generados por el CLI de shadcn y se regenerarían con su estilo original. Script en `scratchpad/tipografia.mjs`, con detección de contexto por etiqueta (avanza carácter a carácter hasta el `>` real, porque las arrow functions dentro de `{...}` traen `>` que no cierra nada). | 32 archivos `.jsx` + `index.css` |
| 2026-08-07 | **0 · tipografía (secuelas del script)** | ⚠️ **Nota para quien repita un barrido así.** La limpieza de comas huérfanas (`,\s*}`) se comió **181 comas finales legítimas** en 23 archivos, y la de espacios dobles rompió la **alineación en columnas** de objetos literales en 19. Ambas se revirtieron con scripts que comparan contra `HEAD` línea a línea (`restaurar-comas.mjs`, `restaurar-alineacion.mjs`). El segundo introdujo **3 errores de sintaxis**: normaliza quitando la coma final, así que una línea que sí necesitaba coma se sustituyó por la versión de HEAD que no la tenía (`RotateCcw`, `Ban`, y un `))` del sort de `DashboardPage`). Se localizaron los tres de una sola pasada con `npx esbuild --loader:.jsx=jsx` sobre los archivos modificados, en vez de ir uno por uno con `npm run build`. **Lección: al restaurar formato contra HEAD hay que conservar la coma final de la versión de trabajo, no la de HEAD.** | — |
| 2026-08-07 | **Bloque 2 · P1/P2/P4/P7** | ✅ **Proyectos: paginación, filtros, archivar sin eliminar y sin contador de tareas.** Paginación real de **9 por página** (3 filas de la rejilla) con `meta` del servidor. **Los tres filtros bajaron al servidor** — antes el de estado filtraba solo lo ya descargado, y con paginación eso habría dado totales y número de páginas falsos. Backend: dos parámetros nuevos en `proyectos.listar`, **`area`** (`contains`, porque el campo guarda varias áreas separadas por coma) y **`excluirEstado`** (para que "Todos" siga dejando fuera los archivados sin cambiar lo que recibe quien llama sin filtros, como el gantt del Inicio). Los chips de estado pasaron a desplegable y se sumó el de **área**; los tres controles van en una fila. Cualquier cambio de filtro vuelve a la página 1. **Quitado "Eliminar" del menú de la tarjeta** (el endpoint del backend sigue existiendo, solo ya no hay forma de llamarlo desde la UI) y **quitado el contador de tareas** del pie, donde ahora va el nombre de quien creó el proyecto. Resuelve la contradicción anotada en la sección 6: el usuario confirmó archivar y quitar eliminar. ⚠️ Las tarjetas siguen con colores fijos (`bg-white`, `text-slate-900`) y `font-black`/mayúsculas — pendiente para la pasada final de tipografía y modo oscuro. | `proyectos.controller.js`, `ProyectosPage.jsx`, `PreferencesContext.jsx` (`projectFilterAllAreas` ×2) |
| 2026-08-07 | **Bloque 7 · gantt (4ª pasada)** | ✅ **El gantt se ajusta al panel**: barra de control arriba y paginación abajo fijas, filas desplazables en medio. Antes crecía a su alto natural dentro del panel y la paginación quedaba fuera de vista, sin scrollbar que avisara — el usuario lo reportó como "le falta paginación y scrollbar". Clave del arreglo: **el desplazamiento vertical vive en el contenedor que envuelve las dos columnas**, y la columna de barras lleva `overflowX: auto` + **`overflowY: hidden`**; sin ese `hidden`, `overflow-x: auto` computa `overflow-y: auto` y la columna crearía su propio scroll vertical, desincronizando nombres y barras. Tipografía del encabezado del gantt corregida a 600/400 (venía en 900/700). | `DashboardPage.jsx` |
| 2026-08-07 | **Bloque 7 · D8/D12/D13/D15** | ✅ **El Inicio pasó de 4 bloques apilados a un solo panel con pestañas**: Actividades (arranque) · Gantt · Progreso de proyectos · Progreso por mes. `VISTAS_PANEL` + `ALTO_PANEL_INICIO` (`clamp(600px, 100vh−72px, 1000px)` — calibrado para que quepan ~10 personas en la lista de actividad (fila de 62px); el usuario aceptó que la página desplace) para que las 4 midan lo mismo y cambiar de vista no mueva nada. Los 4 componentes perdieron su `card` y su `marginBottom` y ahora son `flex h-full min-h-0 flex-col`; sus listas internas cambiaron de topes en `vh` a `flex-1 min-h-0` para llenar el panel. Cabeceras y paginación quedan fijas, solo desplaza el contenido. El gantt bajó de 8 a **6 proyectos por página** para caber sin desplazar. En Actividades, **las personas se ordenan por número de actividades (de más a menos) y al empatar por nombre** — a primera hora, con todos en cero, sale alfabético solo. **Cierra D8, D13 y D15.** | `DashboardPage.jsx`, `PreferencesContext.jsx` (4 claves ×2 idiomas) |
| 2026-08-07 | **Bloque 7 · D12 (vista general)** | ✅ **Vista General unificada al maestro-detalle.** Ya no son tarjetas apiladas por persona: usa la misma lista de la izquierda que las vistas de día, y a la derecha **tres columnas por estado — Pendientes / En progreso / Terminadas** — con lo acumulado de la persona (no lo del día). **Se quitó la columna "faltan esta semana"** (la pestaña *Esta semana* ya cubre eso) y con ella el icono `CalendarDays`. Nuevo **filtro por proyecto** que aplica a las 4 pestañas, tanto a los conteos de la izquierda como al detalle; su catálogo sale de `todasConFecha` (solo proyectos donde alguien tiene algo). El **selector de día se oculta en General** porque esa vista no es de una fecha. **Buscador movido al centro** de la fila de controles. `ActivityBucket` perdió las mayúsculas y el peso 900 (regla de tipografía del usuario). Sin cambios de backend: `todasConFecha` ya traía `estado` y `proyecto`. | `DashboardPage.jsx`, `PreferencesContext.jsx` (6 claves nuevas ×2 idiomas) |
| 2026-08-07 | **Bloque 7 · D12 (maestro-detalle)** | ✅ **Actividad del equipo rediseñada a maestro-detalle.** A la izquierda la lista de personas con el número de tareas de cada una; al elegir a alguien, a la derecha sale su lista completa con **qué tarea, de qué proyecto y a qué hora** se hizo. Las pestañas Hoy / Mañana / Semana funcionan igual; la vista **General** se dejó como estaba (4 columnas). Buscador de personas incluido. ⚠️ **Al aplicar este cambio se borraron por error el gantt (`ProjectTimeline`) y la gráfica de actividad por mes (`ActividadPorMes`); ambos se reconstruyeron con todos los ajustes previos** (paginación de 8, selector de proyecto y de escala, etiqueta de fechas en 3 posiciones, barras rayadas para fechas estimadas, avatares con foto, tipografía 600/500/400). **Requieren revisión visual.** | `DashboardPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 7 · D12 (vistas)** | ✅ La actividad del equipo pasó de **4 columnas simultáneas a 4 vistas** con `Tabs` de shadcn: **Hechas** (por defecto, con hora de cierre) · Mañana · Esta semana · General (conserva las 4 columnas). Añadido **buscador de personas** y el bucket `faltanManana` en el backend. | `stats.controller.js`, `DashboardPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 7 · D12 (filtro por día)** | ✅ **Filtro por día en la actividad del equipo**, con flechas de día anterior/siguiente, selector de fecha y botón "Hoy". Cada tarea completada muestra **la hora de cierre**. Endpoint nuevo `/api/stats/actividad-equipo?fecha=`. ⚠️ **Corregido de paso un bug de producción**: el corte del día se calculaba en UTC, así que todo lo cerrado después de las 18:00 hora de México contaba como del día siguiente. Ver sección 5-sexies. | `fechas.utils.js` (nuevo), `stats.controller.js`, `stats.routes.js`, `api.js`, `DashboardPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 7 · D7/D9/D10/D11** | ✅ **Progreso de proyectos ahora es una tabla** (`Table` de shadcn) con columnas proyecto · estado · progreso · tareas · pendientes · miembros · inicio. **Filtro de estado** con "En curso" por defecto, que deja fuera terminados y archivados, y **paginación de 10**. **Quitada la sección "Flujo reciente"**. Encabezado del Inicio compactado: título e indicadores en una sola franja (de ~300 px a ~80 px de alto). | `DashboardPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 7 · D5/D14 + limpieza** | ✅ **Quitado el calendario del Inicio** (tarea D5) y con él los componentes `ProjectCalendarPanel` (195 líneas) y `TeamOccupationCalendar` (672). El gantt **ya no se minimiza**, está siempre visible. Las cards pasaron a **texto plano vertical sin caja ni fondo en los iconos**, y quedaron **solo 3**: proyectos, tareas y pendientes (tarea D14) — fuera las dos de "hechas" y la de equipo. Corregidos dos defectos de texto: `capitalize` de CSS ponía mayúscula a **cada** palabra ("Mayo De 2026"), y el texto blanco dentro de barras claras no se leía (ahora el color se elige por luminancia). **DashboardPage pasó de 1846 a 1068 líneas** y el lint del proyecto bajó de 55 a 48 problemas. | `DashboardPage.jsx` |
| 2026-08-07 | **Bloque 7 · gantt (3ª pasada)** | ✅ Tipografía del gantt según la escala pedida por el usuario (**títulos 600, subtítulos 500, texto 400**), fuera las mayúsculas forzadas (meses con `capitalize`, que `toLocaleDateString` devuelve en minúscula), etiquetas **arriba** de los desplegables, y los botones pasados al **`Button` de shadcn**. ⚠️ Es la **primera vez que se pintan los tokens de color de shadcn** — es el momento de validar el puente en modo oscuro. | `DashboardPage.jsx` |
| 2026-08-07 | **Bloque 7 · gantt (2ª pasada)** | ✅ La lista de **29 chips de proyecto** (ocupaba 4 renglones) pasó a un **desplegable**. Añadida **paginación de 8 proyectos** por página en la línea de tiempo. Corregido que la etiqueta de fechas se cortaba en el borde derecho: si no cabe después de la barra, ahora se dibuja antes. Y el **eje de tiempo se calcula sobre todos los proyectos filtrados, no sobre la página visible** — si no, cada página tendría un rango distinto y las barras saltarían al paginar. | `DashboardPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 7 · D1/D2/D3/D4** | ✅ **Gantt general del Inicio.** Selector de escala (semana/mes/trimestre) con `Select` de shadcn y desplazamiento horizontal; al elegir un proyecto la línea de tiempo muestra **solo ese** (con botón para volver a todos); barras con ancho mínimo y las de duración inventada se dibujan **rayadas**; y nueva vista **"Actividades completadas por mes"** alimentada por `stats.actividadPorMes`. | `DashboardPage.jsx`, `stats.controller.js`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 2 · P2** | ✅ **Buscador en Proyectos y en Usuarios.** Va **al servidor** (no filtra lo ya cargado) para que siga sirviendo cuando las listas estén paginadas, con retardo de 350 ms vía `useDebounce`. En Usuarios el término forma parte de la clave de SWR, así cada búsqueda se cachea aparte. Detalle de usabilidad: el esqueleto de carga **solo sale la primera vez** — si saliera en cada búsqueda, el input se desmontaría y se perdería el foco al escribir. | `useDebounce.js` (nuevo), `api.js` (`construirQuery`), `ProyectosPage.jsx`, `UsuariosPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **Bloque 1 · API** | ✅ **Paginación y filtros** en `proyectos`, `tareas` y `usuarios`, con utilidad compartida. **Aditivo**: sin `page`/`limit` la respuesta es idéntica a la anterior, así que el frontend desplegado no se entera. Verificado con 22 pruebas de la utilidad y 14 contra la base real. Ver sección 5-quater. | `paginacion.utils.js` (nuevo), `proyectos.controller.js`, `tareas.controller.js`, `usuarios.controller.js` |
| 2026-08-07 | **Bloque 1 (detalle)** | ✅ El detalle del proyecto también muestra el **estado** y el aviso **"Listo para revisión"**, y su menú de 3 puntitos incluye terminar / reactivar / archivar / desarchivar. Antes solo estaba en la tarjeta del listado. | `ProyectoDetallePage.jsx` |
| 2026-08-07 | **Bloque 1 · P3/P5/P6/P8/D10** | ✅ **Modelo de estados de proyecto rehecho.** `ACTIVO / INACTIVO / TERMINADO / ARCHIVADO`. Catálogo único en `backend/src/utils/estados.utils.js` y `frontend/src/utils/estadosProyecto.js` (antes estaba duplicado en 3 archivos del front, cada uno con sus colores). El backend ahora **valida** el estado (era texto libre) y normaliza al guardar. Switch activo/inactivo en el formulario; terminar/reactivar/archivar/desarchivar desde el menú de la tarjeta. Distintivo **"Listo para revisión"** cuando un proyecto activo llega al 100% de tareas. El filtro "Todos" deja fuera los archivados. | `estados.utils.js` (nuevo), `estadosProyecto.js` (nuevo), `proyectos.controller.js`, `agenda.controller.js`, `stats.controller.js`, `sort.utils.js`, `ProyectosPage.jsx`, `DashboardPage.jsx`, `EquipoPage.jsx`, `PreferencesContext.jsx` |
| 2026-08-07 | **M2 + D6** | ✅ **Quitada la actividad del usuario de Gestión de Usuarios** (panel desplegable, columnas hechas/en progreso/vencen, resumen por proyecto) **y el bloque "Top productividad" de Inicio**. Iban juntos: *Top productividad* era lo único que enlazaba a ese panel vía `/usuarios?actividad=<id>`. Se borraron `UserActivityPanel`, `ActivityColumn`, `ProjectSummary`, `TaskMini`, `actividadVacia`, `actividadDesdeTareas`, `ordenarPorFecha`, el estado `actividadAbierta` y el manejo del parámetro `?actividad=`. **El endpoint `usuariosService.actividad` y su ruta en el backend se dejaron intactos** por si se reusan en otro módulo. | `UsuariosPage.jsx` (−149 líneas), `DashboardPage.jsx` |
| 2026-08-07 | **0 · G2 (parte 3)** | ✅ **Menú extendido y Kanban recolocado.** El usuario ajustó la regla: aplicarlo también con **exactamente 2** acciones, no solo con 3+. Convertidos: fila de tarea del detalle, tarjeta de proyecto, evento de la agenda, tarjeta de Usuarios en móvil. En el Kanban, los 3 puntitos se movieron junto a la fecha y la fila de "Avanzar" ya solo se renderiza si la tarea puede avanzar — antes una tarea completada dejaba el botón suelto en una fila vacía. | `KanbanView.jsx`, `ProyectoDetallePage.jsx`, `ProyectosPage.jsx`, `AgendaPage.jsx`, `UsuariosPage.jsx` |
| 2026-08-07 | **0 · G2 (parte 2)** | ✅ **Menú de 3 puntitos.** El usuario aclaró que G2 no era solo poner etiquetas: con más de 2 botones en un componente hay que agruparlos. Creado `ActionMenu.jsx` (Radix DropdownMenu) y aplicado en 4 sitios. Decisión suya: la acción principal queda **fuera** del menú. Ver "Regla de acciones por componente". | `ActionMenu.jsx` (nuevo), `KanbanView.jsx`, `UsuariosPage.jsx` (×2), `ProyectoDetallePage.jsx`, `PreferencesContext.jsx` (`moreOptions`) |
| 2026-08-07 | **0 · G2** | ✅ **Tooltips aplicados en todo el sistema.** Componente `Tooltip.jsx` (envoltorio de Radix) que además inyecta `aria-label` en el hijo — Radix solo aporta `aria-describedby`, que es *descripción*, no *nombre* accesible. **44 de 57 botones de solo icono** quedaron etiquetados; los 13 restantes no son de solo icono (muestran texto vía `{variable}`). De paso se conectó `t()` en 6 componentes que tenían texto en español fijo. **Cierra G2.** | `Tooltip.jsx` (nuevo), `App.jsx`, `KanbanView`, `TaskComments`, `TaskAttachments`, `RangeDatePicker`, `ModalEvento`, `ModalConfiguracionAgenda`, `ToastContext`, `LoginPage`, `InvitationPage`, `UsuariosPage`, `ProyectosPage`, `ProyectoDetallePage`, `AgendaPage`, `DashboardPage`, `PreferencesContext` (8 claves nuevas) |
| 2026-08-07 | **0 · G6/G7/A4 + obs. usuario** | ✅ **Componente `Modal` común creado** sobre Radix Dialog y aplicado a **las 11 ventanas**. Resuelve de raíz: scroll dentro de la tarjeta (el usuario reportó que la barra se salía por la esquina redondeada), encabezado/pie fijos, cierre con **Esc** y **clic fuera**, bloqueo de scroll del fondo y foco atrapado. El usuario validó el look con 2 ventanas antes de extenderlo. **Cierra G6, G7 y A4.** | `src/components/Modal.jsx` (nuevo), `ModalEvento.jsx`, `ModalImportar.jsx`, `ModalConfiguracionAgenda.jsx`, `ProyectosPage.jsx`, `ProyectoDetallePage.jsx` (×3), `UsuariosPage.jsx` (×2), `AgendaPage.jsx`, `DashboardPage.jsx`, `PreferencesContext.jsx` (clave `agendaSettingsTitle`) |

### 🚀 Publicado

| Commit | Fecha | Contenido |
|---|---|---|
| `e40a01b` | 2026-08-07 | shadcn, scrollbar, scroll entre páginas, avatares, las 11 ventanas |
| `1dccc9e` | 2026-08-07 | `tareas_generadas.json` (el usuario confirmó que el repo es privado) |
| `a8dea05` | 2026-08-07 | tooltips, menú de 3 puntitos, quitada la actividad de usuario y Top productividad, arreglado el bug de `tareasService` |

Todo desplegado en el CRM en vivo vía Vercel, con aprobación explícita del usuario en cada subida.

### Decisiones técnicas tomadas en el Bloque 0

- **No se definió `borderColor.DEFAULT`** en Tailwind. shadcn normalmente añade `* { @apply border-border }`, pero eso habría cambiado el color de las **~450 clases `border` ya existentes** en el código. En su lugar se parchearon los 7 puntos de los componentes shadcn que usaban `border` sin color → `border border-border`.
- **Se mantuvo Tailwind v3** (CLI `shadcn@2.10.0`). Subir a v4 ahora sería una segunda migración simultánea.
- **Override de ESLint** para `src/components/ui/**`: shadcn exporta `buttonVariants`/`badgeVariants` junto al componente, lo que dispara `react-refresh/only-export-components`. Es código de terceros.
- `PerfilPage` **no** se migró a `UserAvatar` a propósito: usa `previewFoto` para mostrar la imagen recién elegida antes de subirla, y su fondo ya es neutro.

### 📐 Regla de acciones por componente (definida por el usuario, 2026-08-07)

**Con 2 o más acciones en una tarjeta, fila o barra, van a un menú de 3 puntitos** ([ActionMenu.jsx](frontend/src/components/ActionMenu.jsx)). Si hay una acción claramente principal y frecuente (*Avanzar* en el Kanban, *Nueva tarea* en la barra del detalle), esa queda visible y el resto entra al menú. Con una sola acción, botón suelto con su `Tooltip`.

> El usuario ajustó esta regla sobre la marcha: al principio dijo "más de 2", pero luego pidió aplicarlo también donde quedaban exactamente 2. El criterio real es **cuántos botones se ven a la vez**, no el número exacto.

El objetivo del usuario es visual: menos botones a la vista y menos espacio ocupado en cada tarjeta. **No** aplica a navegación (flechas anterior/hoy/siguiente), pies de formulario (Cancelar/Guardar), pestañas, ni a menús que ya son desplegables.

Aplicado en: tarjeta del Kanban · fila de Usuarios (escritorio) · tarjeta de Usuarios (móvil) · barra del detalle de proyecto. Queda listo para la tarea **P8**, donde la tarjeta de proyecto tendrá 5 opciones.

### ⚠️ Dos reglas del componente `Modal` que NO hay que romper

Están comentadas en el propio archivo, pero se repiten aquí porque son fáciles de deshacer sin querer:

1. **La tarjeta se centra con `inset-0 + m-auto`, nunca con `translate`.** Un `transform` en la tarjeta la convierte en el contenedor de referencia de sus hijos `position: fixed` — el selector de hora de `ModalEvento` (línea ~74) y el calendario de `RangeDatePicker` (línea ~60) — y el `overflow-hidden` los recortaría dentro del recuadro.
2. **Las animaciones son solo `fade`, sin `zoom` ni `slide`**, por lo mismo: esas utilidades usan `transform`.

> Efecto secundario aceptado: la ventana de crear proyecto **perdió el estilo "hoja inferior" en móvil** (antes subía desde abajo con `slide-in-from-bottom`). Ahora aparece centrada como todas. Es intencional — el usuario pidió que todas se vean igual — pero conviene confirmárselo.

### Ventanas migradas a `Modal` (11 de 11) ✅

`ModalEvento` · `ModalImportar` · `ModalConfiguracionAgenda` · `ProyectosPage` (crear/editar proyecto) · `ProyectoDetallePage` (tarea, exportar, guardar plantilla) · `UsuariosPage` (invitar, editar) · `AgendaPage` (día expandido) · `DashboardPage` (día expandido).

El único `fixed inset-0` que queda fuera es [Layout.jsx:349](frontend/src/components/Layout.jsx#L349) — es el fondo del menú lateral en móvil, no una ventana emergente. **No migrar.**

**Cambios de UI derivados, ya aceptados:**
- `ModalConfiguracionAgenda` ganó un título (nueva clave i18n `agendaSettingsTitle`) porque antes solo tenía las pestañas, y ahora **tiene scroll**: antes su tarjeta no tenía `maxHeight`, así que con contenido largo se salía de la pantalla.
- Las ventanas que en móvil subían como "hoja inferior" (`slide-in-from-bottom`) ahora aparecen centradas como el resto.

**Detalle conocido sin resolver:** dentro de `ModalEvento`, con el selector de hora abierto, `Esc` cierra la ventana completa en vez de solo el selector. Antes `Esc` no hacía nada. Se resolverá al convertir ese selector a popover (tarea **G6**, "máximo un modal").

### Pendiente del Bloque 0 (a propósito)

- **4 avatares de `DashboardPage`** (líneas ~274, ~673, ~754, ~1242) se dejaron sin migrar: están en secciones que **D5–D8 van a eliminar**. Migrarlos ahora sería trabajo tirado. → **Hacer en el Bloque 7.**
- **G2**: aplicar los tooltips a los botones-icono de cada módulo conforme se toque.

### Verificación

- `npm run build` ✅
- `npm run lint` → **55 problemas, idéntico al baseline de HEAD** (se midió con `git stash`). No se introdujo ruido nuevo.
- CSS compilado: confirmados los tokens en ambos temas (`--primary: 221.2 83.2% 53.3%` claro / `213.1 93.9% 67.8%` oscuro) y `.no-scrollbar`.
- Los 16 componentes shadcn compilan y resuelven el alias `@/` (verificado con un build temporal, ya borrado — el build normal no los tocaba porque aún no se importan).
- ⚠️ **Falta la revisión visual en el navegador.** Build y CSS están verificados, pero nadie ha mirado todavía el resultado en pantalla.

---

## 8. Propuesta shadcn (tarea G5)

> ✅ **Aprobado y ejecutado el 2026-08-07.** Las fases 0 y 1 ya están hechas (ver sección 7).
> Lo que queda es la migración incremental por módulo, descrita abajo.

### Estrategia: instalación en Bloque 0 + migración incremental

**No** migrar los ~50 componentes de golpe. Se instala la base y se migra cada módulo **cuando ya hay que tocarlo** por sus propias tareas. Así la migración sale casi gratis en vez de ser un proyecto aparte.

### Fase 0 — Setup ✅ hecho

Deps instaladas, `jsconfig.json` + `resolve.alias` (`@` → `./src`), `components.json` (JS, `tsx: false`, `baseColor: slate`, `cssVariables: true`), `cn()` en `src/lib/utils.js`, y el **puente de tokens** en `index.css` (bloque comentado tras las variables `--color-*`).

> ⚠️ **Regla de mantenimiento:** si cambias un `--color-*` en `index.css`, actualiza también su token HSL equivalente en el bloque del puente, o el tema claro/oscuro quedará desincronizado en los componentes shadcn.

### Fase 1 — Primitivos ✅ hechos (16 en `src/components/ui/`)

| Primitivo | Desbloquea |
|---|---|
| `dialog` | **G6, G7, A4, A5** — click fuera + ESC + scroll interno, de fábrica |
| `popover` | **G6, DP7** |
| `tooltip` | **G2** |
| `dropdown-menu` | **P8** (botón de 3 puntitos) |
| `switch` | **P6** |
| `table` | **D9** |
| `command` + `checkbox` | **DP12** (multiselect con buscador) |
| `select`, `input`, `button`, `badge`, `tabs` | transversal a todos los bloques |
| `pagination` | **P1, P10, D11, DP8, A7** |
| `scroll-area` | **G1, A1, A4** |

> `pagination` no se instaló: shadcn no lo trae como primitivo de Radix. Se construirá a mano con `button` cuando toque el Bloque 1/2, y se reutilizará en los 5 lugares que lo piden.

### Riesgos a vigilar durante la migración

- **Coexistencia**: shadcn usa clases Tailwind, el código actual usa `style={{}}` inline. Conviven sin problema; el riesgo es visual (inconsistencia temporal), no técnico.
- **i18n**: los componentes de shadcn traen textos en inglés hardcodeados. Hay que pasarlos por `t()` al usarlos.
- **Modo oscuro**: validar en pantalla la primera vez que se renderice un componente shadcn real — el puente de tokens está verificado en el CSS compilado, pero todavía no visualmente.
