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
| D5 | Quitar "Calendario de tareas" |
| D6 | ✅ Quitar "Top productividad" — *hecho el 2026-08-07 junto con M2* |
| D7 | Quitar "Flujo reciente" |
| D8 | Quitar la parte de equipo del inicio |

**Progreso de proyectos**

| ID | Tarea | JSON |
|---|---|---|
| D9 | Cambiar la vista a tabla | 10 |
| D10 | Mostrar proyectos activos y sin terminar (**el admin marca el proyecto como terminado**) | — |
| D11 | Agregar filtros y paginación | — |

**Actividad de equipo**

| ID | Tarea |
|---|---|
| D12 | Ponerlo como prioridad (posición destacada) |
| D13 | Minimizarlo y hacerlo expandible |

**Cards de progreso**

| ID | Tarea |
|---|---|
| D14 | Dejar solo: proyectos, tareas y pendientes |

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
