# Blog — contratos de backend

Qué necesita la plantilla de post del backend, y qué hay ya.

Este documento no decide el esquema. Describe lo que la interfaz ya construida
consume, para que al diseñar las tablas y los endpoints no haya que
reconstruirlo desde los componentes. Todo lo que aparece aquí como "existe" está
verificado contra el código; todo lo demás está marcado como pendiente de
decisión.

Estado a 1 de octubre de 2026: la interfaz está terminada y funciona sobre datos
de maqueta. No hay ni un solo endpoint nuevo escrito.

---

## 1. Cómo se apaga la fase de maqueta

Tres interruptores reales, y dos declarados que todavía no hace nada apagar.

**Conectados** — cada uno vive junto a los datos que sustituye y su módulo
documenta a qué endpoint va:

| Flag | Archivo | Lo lee |
|---|---|---|
| `BLOG_USE_PLACEHOLDER_DATA` | `data/blogPlaceholderPosts.js` | `app/blog/page.js`, `/archive`, `/[slug]`, `/series/[slug]`, `lib/articleHtml.js` |
| `BLOG_USE_PLACEHOLDER_COMMENTS` | `data/blogPlaceholderComments.js` | `lib/comments.js` |
| `BLOG_USE_PLACEHOLDER_NOTES` | `data/blogPlaceholderNotes.js` | `lib/notes.js` |

Se pueden apagar de uno en uno. Los componentes no saben de dónde vienen los
datos: el cambio es de rama dentro del módulo, no de interfaz.

**Declarados pero inertes** — nadie los lee todavía, porque no hay ninguna rama
alternativa a la que ramificar:

| Flag | Archivo |
|---|---|
| `BLOG_USE_PLACEHOLDER_HIGHLIGHTS` | `data/blogPlaceholderHighlights.js` |
| `BLOG_USE_PLACEHOLDER_COURSES` | `data/blogPlaceholderCourses.js` |

Los resaltados se cargan hoy llamando directamente a `getPlaceholderHighlights()`
desde `BlogPostView`, y los cursos igual. Al escribir sus endpoints hay que
crear el módulo intermedio —con la forma de `lib/comments.js`— y hacer que el
flag signifique algo. Apagarlos ahora mismo no cambia nada.

**Aviso: apagar `BLOG_USE_PLACEHOLDER_DATA` rompe la página de post a propósito.**
Ver §6.

---

## 2. Lo que ya existe

Verificado en `backend/`.

**Rutas de blog** (`backend/src/routes/blog.js`):

```
GET    /api/blog           listPublic    público
GET    /api/blog/:slug     getPost       público
GET    /api/blog/admin     listAdmin     ADMIN | COLABORADOR + feature "blog"
POST   /api/blog           createPost    idem
PUT    /api/blog/:id       updatePost    idem
PATCH  /api/blog/:id/publish             idem
DELETE /api/blog/:id       deletePost    idem
```

**`model BlogPost`** tiene: `id, slug, title, excerpt?, coverUrl?, content,
isPublished, publishedAt?, authorId, author, keywords[], relatedPostIds[],
relatedProductIds[], createdAt, updatedAt`.

**`getPost` ya devuelve** `previousPost`, `nextPost` y `relatedPosts` además del
post. El mock los emula con la misma forma.

**Paginación**: `?page=&limit=` y sobre público `{ posts, total, page, totalPages }`
(`listPublic`, con `limit` por defecto 6 y tope 24). Es la convención a repetir.

**Autenticación**: JWT HS256 en la cookie `ienyell_session`, con cabecera
`Bearer` como alternativa. `backend/src/middleware/auth.js` exporta
`authenticateToken`, `authenticateOptional`, `authorizeRole` y
`authorizeFeature`. **`authenticateOptional` es la pieza clave para el blog**:
todo lo público se lee sin sesión, y lo que es del lector se adjunta solo si la
hay.

**Validación**: imperativa a mano en los controladores. El proyecto no usa zod ni
express-validator; no lo introduzcas solo para esto.

**socket.io** está montado, si en algún momento se quieren comentarios en vivo.

---

## 3. Campos que la interfaz usa y el modelo no tiene

Ninguno de estos existe hoy. Están marcados en el mock con el comentario
`(Expected dynamic field: …)` o equivalente.

**Sobre el post:**

| Campo | Para qué | Nota |
|---|---|---|
| `readingTime` | "8 min read" en la cabecera | Derivable de `content`. Decidir si se calcula o se guarda. Ya anotado como TODO en `data/blogPlaceholderPosts.js` |
| `seriesName` | "This post is part of the series:", navegación de secuencia, `/blog/series/[slug]` | Hoy es un string plano. Si se vuelve una relación real, cambia `getSequenceNav()` y nada más de la interfaz |
| `stats.{likes,comments,shares}` | Barra de acciones, tarjetas, panel de herramientas | Ver §4.5 |

**Sobre el autor** (`model User` no tiene ninguno):

`pronouns`, `bio`, `patreonUrl`, `readers`, `followers`, `socials[]`.

Los usa `BlogPostAuthor` y la cabecera. `readers` y `followers` están marcados
con `data-placeholder` en desarrollo porque son cifras inventadas: decidir si son
reales o se quitan antes de publicar.

---

## 4. Contratos por superficie

Los de comentarios y notas ya están escritos en la cabecera de sus módulos; aquí
se repiten para tenerlo todo junto, pero **el módulo manda** si divergen.

### 4.1 Comentarios — `lib/comments.js`

```
GET /api/blog/:slug/comments?page=&limit=
  200 { comments: [...], total, page, totalPages }
```

- `total` cuenta también las respuestas, porque es lo que muestra la cabecera
  ("Read it and drop a comment! (40)"). `comments.length` son las filas de primer
  nivel de esa página.
- La interfaz carga de 3 en 3 (`COMMENTS_PER_BLOCK`) y **añade**, no reemplaza:
  "Read all reactions" pide el bloque siguiente.
- Cada comentario lleva un `highlight` opcional: el fragmento del artículo al que
  está anclado. Es el campo que conecta el hilo con el sistema de anotaciones.
- Faltan por definir: crear, responder, dar like y reportar. La interfaz los tiene
  dibujados y bloqueados sin sesión.

**Pendiente**: `GET /api/blog` tendrá que aceptar `?series=` además de `?topic=`
y `?search=`. El archive ya los manda los tres cuando el flag de maqueta esté
apagado; hoy filtra en cliente sobre la lista local. Como `seriesName` no es
todavía una columna, eso depende de §3.

**Pendiente**: el panel de un fragmento filtra hoy por texto exacto del
`highlight` en el cliente. Debe filtrar por **id de anotación** en el servidor
(`?anchor=`), que es lo que `BlogHighlightPanel` ya documenta.

### 4.2 Notas — `lib/notes.js`

```
GET    /api/blog/:slug/notes    200 { notes: [...] }   solo las propias
POST   /api/blog/:slug/notes    201 { note }           { body, anchor, isPublic }
PATCH  /api/notes/:id           200 { note }           { body, isPublic }
DELETE /api/notes/:id           200 { deleted: true }
```

Todos autenticados y acotados al lector con sesión. Una nota es privada hasta que
`isPublic` diga lo contrario, y listar las de otra persona es una petición de
perfil, no esta.

**Las notas y los comentarios son objetos distintos**, aunque una nota publicada
se renderice como un comentario. Dónde aparece cada cosa:

| | nota privada | nota publicada | comentario |
|---|---|---|---|
| hilo público del post | no | sí | sí |
| perfil del autor | sí | sí | sí |
| margen de su párrafo | sí | sí | no |
| panel del resaltado | no | no | sí |

La fila del panel del resaltado es la que los separa: el panel de un fragmento es
conversación, y una nota es la lectura de alguien, no una respuesta a nadie. El
perfil lleva las dos cosas — es la página del propio lector.

### 4.3 Anotaciones y resaltados

No hay contrato escrito todavía. Lo que la interfaz ya produce y consume:

Un ancla es un par de selectores de la **W3C Web Annotation** — el modelo que
usan Hypothesis y Medium. `lib/annotations.js` los crea y los resuelve:

```js
{
  exact:  "el pasaje literal",
  prefix: "32 caracteres antes",
  suffix: "32 caracteres después",
  start:  1234,   // sobre el texto normalizado del artículo
  end:    1290
}
```

- `start`/`end` son una **pista**, no la verdad. Al resolver se comprueban contra
  la cita y, si no coinciden, se busca la cita usando el contexto. Guárdalos, pero
  no asumas que siguen siendo válidos.
- Si la cita ya no está, la anotación queda **huérfana**: sigue existiendo y
  sigue siendo de quien la escribió, simplemente no se pinta. **No las borres.**
- Los desplazamientos son sobre texto con los espacios normalizados, así que
  reformatear el HTML no mueve todas las anclas del documento.

Lo que la interfaz necesita por resaltado: `id`, `mine` (si es del lector con
sesión), `count` (cuántos lectores lo han marcado) y el selector.

**Un resaltado compartido con contador**, no uno por lector: el artículo muestra
dónde coincidió la gente, no cuántas veces.

**Debe servir también a libros y cursos.** `lib/annotations.js` está escrito sin
saber qué es un post por esa razón. Un `targetType` + `targetId` con índice
compuesto cubre los tres sin tablas separadas.

**Las notas deberían llevar el mismo selector.** Hoy el mock guarda solo la cita
como string y se resuelve con `{exact}`; es suficiente mientras los pasajes sean
largos y distintivos, pero una nota anclada a una frase repetida caerá en la
primera aparición. Está anotado en `data/blogPlaceholderNotes.js`.

### 4.4 El perfil del lector

Ningún endpoint existe. Lo que la página ya consume, y de dónde tendrá que
venir:

| Sección | Fuente que hará falta |
|---|---|
| Notas | `GET /api/users/me/notes` — todas las del lector, de todos los posts, no las de uno solo como §4.2 |
| Comentarios | `GET /api/users/me/comments`, con las respuestas y conversaciones derivadas |
| Resaltados | `GET /api/users/me/annotations`, con el post de cada uno unido — la anotación no lo lleva hoy |
| Leer más tarde | El listado de §4.5 |
| Lista de deseos | Tabla nueva. `model Product` existe; una lista de deseos no |
| Redes del lector | Campos nuevos en `User`, igual que `pronouns` |
| Puntos | Sistema de gamificación. **Las reglas no están decididas**: ni cuántos puntos da cada acción ni qué se canjea |

El perfil es **por niveles**: comprar un curso, pedir un servicio o encargar un
producto desbloquea paneles propios —descargas, envíos, facturación—. Nada de
eso está construido.

**A futuro, acordado y sin construir**: los cursos del lector, los resultados de
sus ejercicios y tareas, y los comentarios de la profesora sobre ellos. También
las notificaciones de reacciones ajenas y silenciar una conversación.

**Lo que el perfil NO es**: no hay mensajería privada ni amigos. Otras personas
ven qué ha leído alguien, sus comentarios y sus notas públicas, y nada más. Los
lectores no suben contenido ni publican nada.

### 4.5 Guardar un post

No hay endpoint. La interfaz tiene el marcador en dos sitios —la barra de
acciones y el panel de herramientas— compartiendo un único estado, y no persiste.
Hace falta un listado para el perfil.

### 4.6 Reacciones y contadores

`stats.{likes, comments, shares}` se muestran en la cabecera, bajo el artículo,
en el panel de herramientas y en cada tarjeta de recomendación. Hoy son
inventados y **optimistas**: pulsar no persiste nada.

Decisiones pendientes: si "shares" se cuenta de verdad o se quita, y si los likes
son por usuario (requiere una tabla de reacciones) o un contador suelto.

### 4.7 Cursos

**No existen como tipo de contenido**: no hay modelo, ni ruta, ni admin. El
enlace "Learn" de la cabecera es un `href="#"`. El bloque está maquetado contra
`data/blogPlaceholderCourses.js`, las tarjetas llevan `href: null` a propósito y
no se renderizan como enlaces.

Los campos que la tarjeta usa: `title, excerpt, coverUrl, keywords[], launchedAt,
updatedAt, stats, badge, href`.

---

## 5. Rutas de frontend que esperan datos

| Ruta | Estado |
|---|---|
| `/blog` | Server Component, lee del mock, TODO apuntando a `GET /api/blog` |
| `/blog/archive` | Componente cliente, lee del mock |
| `/blog/[slug]` | **Server Component**, ver §6 |
| `/blog/series/[slug]` | Componente cliente, serie derivada de `seriesName` |
| `/blog/archive?topic=` | Funciona. El archive lo lee con `useSearchParams` y lo enlazan los chips del rail y de la serie |
| `/blog/archive?series=` | Funciona. Compone con `?topic=` y con la búsqueda, y lo enlaza la página de serie como "Search within this series". **El parámetro ya se envía a `GET /api/blog`, que todavía no lo entiende** |
| `/users/profile` | Construido, vista privada con previsualización de la pública. Exige sesión y redirige a `/users/login` sin ella. **Sin ningún endpoint detrás** |

---

## 6. El riesgo que hay que resolver antes de conectar nada

**El HTML del blog se guarda sin sanear.**

`createPost` y `updatePost` guardan `content` tal como llega del editor. Mientras
el único autor seas tú, es un riesgo teórico. Deja de serlo en cuanto escriba un
`COLABORADOR`, y la página de post ahora se renderiza en servidor, lo que
convierte un HTML malicioso en XSS almacenado servido desde tu propio dominio.

Por eso `lib/articleHtml.js` **lanza un error** si `BLOG_USE_PLACEHOLDER_DATA`
está apagado: se niega a renderizar HTML que nadie ha limpiado, en vez de servir
lo que haya en la base de datos.

Dos formas de levantar ese rechazo, por orden de preferencia:

1. **Sanear al guardar, en el backend.** El camino de lectura no necesita nada
   más, y una migración limpia lo ya guardado una vez. Arregla además el agujero
   para cualquier otro consumidor de esa columna.
2. **Sanear en el servidor al leer**, con `isomorphic-dompurify` o jsdom.
   Funciona, pero corre un parser de HTML completo en cada render de cada post
   para algo que debería ocurrir una vez por guardado.

La lista de lo que el editor puede emitir está en
`ARTICLE_HTML_ALLOWANCES` (`lib/articleHtml.js`): `iframe` como etiqueta extra, y
`allow`, `allowfullscreen`, `frameborder`, `scrolling` y `target` como atributos.
Es la misma que usaba el cliente, para que no cambie en silencio al mover el
saneado.

**`app/work/[slug]/page.js` tiene el mismo patrón** de sanear en cliente al leer.
Queda fuera de la plantilla de blog, pero es el mismo problema.

---

## 7. Otras cosas que conviene saber antes de empezar

**No hay carpeta de migraciones.** `backend/prisma/` solo tiene `schema.prisma` y
los seeds, así que el esquema se ha venido aplicando con `db push`. Añadir las
tablas de anotaciones es un buen momento para decidir si se pasa a migraciones de
verdad, porque a partir de aquí hay datos de usuarios que no se pueden perder.

**`backend/data/` contiene envíos reales de usuarios** (`waitlist.json`,
`commissions.json`, con correos dentro). Está en `.gitignore` y debe seguir
estando.

**El slug `archive` está reservado.** `/blog/archive` es una ruta estática y gana
sobre `[slug]`, así que un post con ese slug sería inalcanzable. Está anotado en
`data/blogPlaceholderPosts.js`.

---

## 8. Resumen de lo que falta decidir

- Si `readingTime` se calcula o se guarda.
- Si `seriesName` se convierte en relación.
- Qué campos de autor son reales y cuáles se quitan (`readers`, `followers`).
- Si los likes son por usuario o un contador.
- Si "shares" se cuenta.
- Si guardar un post desde una tarjeta de recomendación entra en alcance.
- Si los cursos llegan a existir.
- Migraciones sí o no, antes de crear tablas con datos de lectores.
