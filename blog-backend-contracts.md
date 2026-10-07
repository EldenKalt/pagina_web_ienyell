# Blog — contratos de backend

Qué necesita la plantilla de post del backend, y qué hay ya.

Este documento no decide el esquema. Describe lo que la interfaz ya construida
consume, para que al diseñar las tablas y los endpoints no haya que
reconstruirlo desde los componentes. Todo lo que aparece aquí como "existe" está
verificado contra el código; todo lo demás está marcado como pendiente de
decisión.

Estado a 2 de octubre de 2026: las páginas públicas del blog leen artículos,
temas y series del backend. Comentarios, notas, resaltados y cursos mantienen
sus módulos de maqueta independientes.

---

## 1. Cómo se apaga la fase de maqueta

Dos interruptores reales controlan comentarios y notas. Los flags de resaltados
y cursos siguen declarados pero inertes.

**Conectados** — cada uno vive junto a los datos que sustituye y su módulo
documenta a qué endpoint va:

| Flag | Archivo | Lo lee |
|---|---|---|
| `BLOG_USE_PLACEHOLDER_COMMENTS` | `data/blogPlaceholderComments.js` | `lib/comments.js` |
| `BLOG_USE_PLACEHOLDER_NOTES` | `data/blogPlaceholderNotes.js` | `lib/notes.js` |

Las cuatro páginas públicas (`/blog`, `/blog/archive`, `/blog/[slug]` y
`/blog/series/[slug]`) ya consultan el backend. Home y archive obtienen temas
publicados de `GET /api/blog/topics`.

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

---

## 2. Lo que ya existe

Verificado en `backend/`.

**Rutas de blog** (`backend/src/routes/blog.js`):

```
GET    /api/blog           listPublic    público
GET    /api/blog/topics    listPublicTopics    público
GET    /api/blog/series/:slug getPublicSeries   público
GET    /api/blog/:slug     getPost       público
GET    /api/blog/admin     listAdmin     ADMIN | COLABORADOR + feature "blog"
POST   /api/blog           createPost    idem
PUT    /api/blog/:id       updatePost    idem
PATCH  /api/blog/:id/publish             idem
DELETE /api/blog/:id       deletePost    idem
```

**`model BlogPost`** tiene: `id, slug, title, excerpt?, coverUrl?, content,
isPublished, publishedAt?, authorId, author, keywords[], relatedPostIds[],
relatedProductIds[], seriesId?, series?, createdAt, updatedAt`. `BlogSeries`
guarda nombre, slug único, resumen, categoría, objetivo, audiencia y relaciones
con los posts de apertura y los posts destacados.

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

## 3. Metadatos reales del artículo y del autor

**Sobre el post:**

| Campo | Para qué | Nota |
|---|---|---|
| `readingTime` | "8 min read" en la cabecera y tarjetas | Estimación al consultar el texto actual: 200 palabras/minuto, redondeo hacia arriba. No mide vídeos. El texto completo se excluye de los listados. |
| `seriesName`, `seriesSlug` | Enlaces y navegación de series | Derivados de la relación `BlogSeries` existente. |
| `stats.{likes,comments,shares}` | Barra de acciones, tarjetas, panel de herramientas | Contadores reales de F; ver §4.6. |

**Sobre el autor:** `pronouns` y `socialLinks` se guardan en G; `bio` y
`patreonUrl` se añaden en I. La API pública adapta `socialLinks` a `socials[]`
sin enviar correo ni datos privados. Biografía y Patreon se editan desde el
perfil propio solo con permiso de publicar en el blog. La biografía admite
1.500 caracteres y Patreon exige HTTPS y dominio `patreon.com`.

Las cifras `readers` y `followers` se han retirado de la ficha pública hasta
definir una medición real. El botón Patreon se muestra solo si existe un enlace.

---

## 4. Contratos por superficie

Los de comentarios y notas ya están escritos en la cabecera de sus módulos; aquí
se repiten para tenerlo todo junto, pero **el módulo manda** si divergen.

### 4.1 Comentarios — `lib/comments.js`

```
GET /api/blog/:slug/comments?page=&limit=&paragraph=&placement=
  200 { comments: [...], total, filteredTotal, page, totalPages }
GET /api/blog/:slug/comment-locations
  200 { paragraphs: [{ paragraphId, count }], previousCount, generalCount, total }
GET /api/comments/:id/replies
  200 { replies: [...] }
POST /api/blog/:slug/comments
  201 { comment }  { body, anchor?, paragraphId? }
POST /api/comments/:id/replies
  201 { reply }    { body }
GET /api/blog/admin/:id/comment-threads?page=&limit=
  200 { paragraphs, threads, total, page, totalPages }  editorial
POST /api/blog/admin/:id/comment-threads/reassign
  200 { reassigned }  { threadIds, paragraphId|null }  editorial
```

- `total` cuenta también las respuestas, porque es lo que muestra la cabecera
  ("Read it and drop a comment! (40)"). `comments.length` son las filas de primer
  nivel de esa página.
- La lista del artículo carga de 3 en 3 (`COMMENTS_PER_BLOCK`) y **añade**, no reemplaza:
  «Read more comments» pide el bloque siguiente. Las respuestas se cargan al abrir cada hilo.
- Cada comentario lleva un `highlight` opcional: el fragmento del artículo al que
  está anclado. Es el campo que conecta el hilo con el sistema de anotaciones.
- Crear y responder exige sesión; cada texto admite hasta 2.500 caracteres y la
  interfaz muestra el contador. Dar like y reportar siguen pendientes.
- Al eliminar la cuenta de quien comentó, el texto y las respuestas permanecen;
  el nombre se sustituye por «Reader». Lo mismo sucede con el nombre del actor
  editorial en el historial de reasignaciones.
- El párrafo se valida en servidor contra el cuerpo actual. Una corrección conserva
  su identificador; si se elimina, el hilo completo aparece al final con su cita
  y copia del párrafo anterior. La reasignación editorial de uno o varios hilos
  es atómica y registra actor y destino. «Dejar sin asignar» conserva respuestas.
- Las marcas de resaltado personal nunca se envían en estas rutas. Los iconos de
  párrafo se calculan con el comentario raíz y sus respuestas, sin contar a una
  persona dos veces por selecciones superpuestas.

`GET /api/blog` accepts `?series=` alongside `?topic=` and `?search=`. All three
filters narrow the same query used for rows and their total. `GET
/api/blog/series/:slug` returns the series' editorial metadata and its published
posts in reading order.

El panel público de conversación se filtra por identificador estable de párrafo.
La cita concreta se muestra dentro de cada comentario; el marcado personal no
define la identidad de una conversación pública.

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

**Las notas y los comentarios son objetos distintos.** Una nota publicada aparece
en la sección «Notas públicas» del artículo, separada de la conversación. Su
integración en el perfil se realiza en el bloque G.

| | nota privada | nota publicada | comentario |
|---|---|---|---|
| hilo público del post | no | no | sí |
| «Notas públicas» del artículo | no | sí | no |
| perfil del autor (G) | sí | sí | sí |
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

El perfil propio y el público usan estas rutas paginadas:

```
GET   /api/users/me/profile
PATCH /api/users/me/profile                 { handle?, pronouns?, socialLinks?, bio?, patreonUrl? }
GET   /api/users/me/notes?page=&limit=
GET   /api/users/me/comments?page=&limit=
GET   /api/users/me/annotations?page=&limit=
GET   /api/users/me/wishlist?page=&limit=
GET   /api/users/me/wishlist/search?q=
PUT   /api/users/me/wishlist/:productId
DELETE /api/users/me/wishlist/:productId
GET   /api/reader-profiles/:handle
GET   /api/reader-profiles/:handle/notes?page=&limit=
GET   /api/reader-profiles/:handle/comments?page=&limit=
```

Las rutas `/me` exigen sesión y nunca aceptan un ID de otro lector. La URL
pública usa un alias elegido por la persona, no el ID numérico. El alias se puede
cambiar; las URL antiguas redirigen al nuevo. La vista «What others see» llama a
las mismas consultas públicas con `_self` para aplicar la privacidad en el
servidor incluso antes de elegir un alias.

El perfil público muestra el nombre, pronombres y enlaces HTTPS que la persona
guardó, más sus comentarios y notas expresamente publicadas sobre posts
disponibles. No envía correo, notas privadas, resaltados, lista de deseos ni
artículos guardados. El perfil propio sí puede leer sus escritos de posts
retirados; los muestra sin enlace al artículo. Las listas se paginan.

| Sección | Estado en G |
|---|---|
| Notas | Lectura propia y pública real, de todos los posts |
| Comentarios | Lectura propia y pública real, con respuestas conservadas |
| Resaltados | Solo vista propia; cada marca incluye el post cuando existe |
| Leer más tarde | Lista privada de E |
| Lista de deseos | Tabla privada, búsqueda de productos activos, añadir y quitar |
| Redes y pronombres | Campos propios editables y lectura pública controlada |
| Puntos | Sin cifra inventada; reglas de obtención y canje pendientes |

El perfil es **por niveles**: comprar un curso, pedir un servicio o encargar un
producto desbloquea paneles propios —descargas, envíos, facturación—. Nada de
eso está construido.

**A futuro, acordado y sin construir**: los cursos del lector, los resultados de
sus ejercicios y tareas, y los comentarios de la profesora sobre ellos. También
las notificaciones de reacciones ajenas y silenciar una conversación.

**Registro de lecturas, a futuro.** El perfil debe mostrar *qué ha leído* una
persona, y eso no existe: "leer más tarde" es lo que alguien guarda, no lo que ha
leído. Hace falta una tabla que registre la lectura de un post por usuario, y
antes que eso dos decisiones:

- **Qué cuenta como leído.** Abrir el post, llegar al final, o un porcentaje del
  artículo. La capa de anotaciones ya mide el cuerpo, así que la señal es
  obtenible; lo que falta es el umbral.
- **Si el lector puede ocultarlo.** Es la sección más expuesta del perfil
  público, y la que más probablemente alguien quiera apagar.

**Perfiles públicos de otras personas.** La URL usa el alias elegido por la
persona (`/users/lector`). Cambiarlo conserva las URL antiguas como redirecciones.
La lectura pública incluye solo comentarios y notas publicadas de artículos
disponibles. El historial de lecturas sigue pendiente de las decisiones anteriores.

**Lo que el perfil NO es**: no hay mensajería privada ni amigos. Los lectores
no suben contenido ni publican posts.

### 4.5 Guardar un post

```
GET    /api/blog/saved?page=&limit=  200 { posts, total, page, totalPages }
GET    /api/blog/:slug/save        200 { saved }
PUT    /api/blog/:slug/save        200 { saved: true }
DELETE /api/blog/:slug/save        200 { saved: false }
```

Todas estas rutas requieren sesión. `PUT` y `DELETE` son repetibles sin crear
duplicados ni errores. Un post retirado no se ofrece en la lista pública de
«Leer más tarde»; su marca se conserva por si vuelve a publicarse. El botón de
la cabecera, el del pie y «Keep» comparten el mismo estado persistido. La lista
privada del perfil se pagina y no usa artículos de demostración.

### 4.6 Reacciones y contadores

```
GET    /api/blog/:slug/reactions  200 { likes, liked, shares }
PUT    /api/blog/:slug/like       200 { likes, liked: true }
DELETE /api/blog/:slug/like       200 { likes, liked: false }
POST   /api/blog/:slug/share      200 { shares }
PUT    /api/comments/:id/like     200 { likes, liked: true }
DELETE /api/comments/:id/like     200 { likes, liked: false }
```

Cada cuenta puede dar un «me gusta» una vez a un artículo o comentario y
retirarlo. La lectura de contadores es pública; escribir reacciones exige
sesión. Las rutas de comentarios no permiten reaccionar si el post se retiró o
desactivó sus comentarios. `shares` cuenta acciones confirmadas por el navegador:
compartir desde el sistema o copiar el enlace. No demuestra que otra persona lo
haya abierto. El endpoint de compartir tiene límite por IP.

`stats.{likes, comments, shares}` se obtienen de la base de datos y aparecen en
el artículo y sus recomendaciones. Los comentarios cuentan raíces y respuestas;
los «me gusta» de comentarios se leen junto a cada bloque paginado. Escuchar el
artículo continúa deshabilitado porque aún no hay narración.

### 4.7 Cursos

**Pendientes de definir:** no hay modelo, ruta ni administración de cursos.
El enlace «Learn» y las tarjetas de ejemplo bajo el artículo se han ocultado.
La maqueta se conserva en `data/blogPlaceholderCourses.js`, pero ya no se
consume desde las páginas públicas.

Los campos que la tarjeta usa: `title, excerpt, coverUrl, keywords[], launchedAt,
updatedAt, stats, badge, href`.

---

## 5. Rutas de frontend que esperan datos

| Ruta | Estado |
|---|---|
| `/blog` | Server Component, lee `GET /api/blog` y `GET /api/blog/topics` |
| `/blog/archive` | Componente cliente, lista y filtra con `GET /api/blog` y `GET /api/blog/topics` |
| `/blog/[slug]` | **Server Component**, lee `GET /api/blog/:slug`, ver §6 |
| `/blog/series/[slug]` | Componente cliente, lee `GET /api/blog/series/:slug` |
| `/blog/archive?topic=` | Funciona. El archive lo lee con `useSearchParams` y lo enlazan los chips del rail y de la serie |
| `/blog/archive?series=` | Filtra desde el backend y compone con `?topic=` y la búsqueda. |
| `/users/profile` | Perfil propio conectado a las rutas `/api/users/me/*`; exige sesión y ofrece previsualización pública. |
| `/users/[handle]` | Perfil público conectado a `/api/reader-profiles/:handle`, con redirección de alias anteriores. |

---

## 6. Saneado del HTML del artículo

`createPost` y `updatePost` limpian `content` en el backend con DOMPurify y
jsdom, usando las extensiones de `ARTICLE_HTML_ALLOWANCES` en
`lib/articleHtml.js`. Una revisión de las filas existentes encontró cero posts
en la base configurada. La página de post solo confía en el HTML de la API tras
el saneado al guardar; `sanitizeArticleHtml` sigue rechazando cualquier HTML
que no se marque explícitamente con una fuente confiable.

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

- Cómo medir lectores y seguidores si se decide añadir esos contadores.
- Si guardar un post desde una tarjeta de recomendación entra en alcance.
- Si los cursos llegan a existir.
- Migraciones sí o no, antes de crear tablas con datos de lectores.
