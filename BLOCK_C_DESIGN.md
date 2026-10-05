# Bloque C1 — Diseño de resaltados y notas

Estado: C1 aprobado y C2 implementado en el código local. El esquema nuevo aún no está aplicado en la base remota: la generación de Prisma encontró un archivo bloqueado en Windows. Las funciones que dependen de la base no están verificadas en un sitio en vivo.

En C2 se conectaron las notas privadas y públicas del artículo, los resaltados personales, el aviso previo al login, el límite de 2.500 caracteres y las opciones de notas/comentarios por post. Los identificadores de párrafo se guardan dentro del HTML del artículo; no se creó una tabla `ArticleParagraph`. El servidor deriva el párrafo de la selección y no acepta un `paragraphId` arbitrario del navegador. Los iconos y hilos de comentarios por párrafo, su reasignación en lote y el archivo de versiones pertenecen a D; las notas en el perfil pertenecen a G. El muro de acceso requiere definir antes el modelo real de membresías y se mantiene como diseño, sin una protección parcial ficticia.

## 1. Objetivo y alcance

Guardar los resaltados y las notas del lector, recuperarlos al volver al artículo y conservarlos cuando cambie el texto. Compartir el motor de anclaje con futuros libros y cursos, activando únicamente el blog en C2.

La interfaz de lectura ya existe. Se propone conservar su presentación y conectar sus acciones, estados de carga y errores. Comentarios, perfiles y sus agregaciones siguen siendo bloques posteriores. El diseño identifica sus dependencias para evitar presentar una función como terminada cuando necesita esos bloques.

Fuentes locales revisadas: `lib/annotations.js`, `lib/highlights.js`, `lib/notes.js`, `blog-backend-contracts.md` §4.2–4.3, datos de maqueta de notas/resaltados, componentes que los consumen, rutas del blog, autenticación y esquema Prisma. Las cabeceras de los módulos prevalecen sobre el informe de traspaso. Este documento propone extensiones; no sustituye esos contratos aprobados.

## 2. Estado confirmado en el código

| Existe | Falta |
|---|---|
| Selector completo y resolución por cita, contexto y posición | Persistencia, validación y autorización |
| Pintado local de resaltados y división de selecciones propias | Guardado privado y recuperación del resaltado del propio lector |
| `lib/notes.js` con cuatro rutas documentadas | Implementar rutas y añadir operaciones de escritura al módulo |
| Panel y marcas de notas en el margen | Un único estado compartido y conservación del selector completo |
| Casilla para publicar una nota | Lectura pública de notas y conexión con hilo/perfil |

Hallazgos que condicionan C2:

- `BlogPostView` carga notas y resaltados directamente desde la maqueta. El panel de notas carga por separado. Guardar una nota vacía el formulario sin persistir nada.
- `onNote` recibe el selector completo pero conserva únicamente el texto; `BlogMarginNotes` reconstruye `{ exact }`. Las frases repetidas pierden su contexto.
- `segmentHighlights` suma los contadores de las anclas superpuestas y puede contar dos veces a una persona. En el modelo acordado, las marcas personales no se muestran a otros lectores ni alimentan iconos públicos.
- Las notas públicas deben aparecer en un apartado propio del artículo y en el perfil. No son comentarios y no aparecen en su hilo.
- `authenticateToken` aplica restricciones existentes a cuentas inactivas y ciertos clientes con cuotas vencidas. No se debe eludir esa política para escribir anotaciones. `authenticateOptional` sirve para personalizar una lectura pública.

## 3. Experiencia propuesta

**Resaltar.** Las rayas de resaltado son personales: quien las crea las ve sobre las palabras exactas al volver al artículo; los demás lectores no las ven. No hay contador social de personas que resaltaron. El artículo no se llena de marcas ajenas.

**Comentarios y notas públicas.** Se conectan a un párrafo con una etiqueta estable. Un pequeño icono junto al párrafo abre la conversación y muestra cuántos comentarios tiene (incluidas respuestas, de acuerdo con el contrato existente). Cada comentario conserva la cita que seleccionó su autora o autor, para que otras personas vean qué parte motivó el comentario. La cita explica el comentario; el párrafo determina dónde aparece. Los resaltados personales y la actividad de comentarios son cosas separadas.

**Tomar una nota.** Una selección puede producir una nota sobre ese fragmento; el panel abierto sin selección produce una nota general del artículo. Una nota es privada por defecto. Las notas que su autora elija publicar aparecen en «Notas públicas» dentro del artículo y en su perfil; nunca se mezclan con los comentarios. Se permite una nota educativa, una definición, información útil, un recuerdo o la solución a una duda o ejercicio. Máximo: 2.500 caracteres, con contador visible; al excederlo, contador rojo y guardado bloqueado hasta recortar el texto.

**Qué funciones ofrece cada artículo.** La persona que edita el post elige: comentarios y notas, solo comentarios, solo notas o ninguno. El caso normal empieza con ambos activos. Ocultar una función también debe bloquear su API: no basta con esconder el botón.

**Texto editado.** Cada párrafo tiene una etiqueta estable que el editor conserva al corregirlo. Si se corrige una falta, el párrafo mantiene su identidad y el icono, los comentarios y las respuestas siguen allí; la cita que dejó quien comentó conserva la escritura original. Si se elimina el párrafo, el comentario y todo su hilo pasan a una sección de comentarios sobre una versión anterior, al final de la conversación, con una copia del párrafo y la cita original. No se pierden. Una herramienta editorial incluida en el diseño del bloque D permite seleccionar uno o varios hilos completos, con todas sus respuestas, y asignarlos a otro párrafo o dejarlos sin asignar. No se pide revisar manualmente cada comentario por cada edición pequeña.

**Sin sesión.** Las acciones personales muestran un aviso con «Iniciar sesión» o «Seguir leyendo». Cancelar deja a la persona en el artículo. Al iniciar sesión, vuelve al artículo desde el que vino, no al panel administrativo. Un artículo cerrado para visitantes muestra su etiqueta y requisito de acceso antes del muro.

**Artículo para miembros o personas con cuenta.** El visitante puede ver el título, el requisito y los primeros tres párrafos; después encuentra el muro. Si el post permite leer solo a cuentas, el botón ofrece entrar o crear cuenta. Si requiere un nivel de membresía, muestra ese nivel. Para lectores autorizados se entrega el texto completo. El servidor decide qué versión enviar: ocultar el texto en el navegador con una capa encima no sirve, porque se podría quitar desde las herramientas del navegador.

La vista pública, el HTML inicial, los metadatos, las respuestas del API y cualquier respuesta almacenada en caché deben incluir solo el avance gratuito. Las rutas de post y sus anotaciones comprueban la sesión y el nivel antes de enviar el cuerpo completo. El sistema vigente de niveles y cómo asignarlo todavía se debe verificar; no se debe asumir que un campo de descuento equivale a una membresía. Si alguien no alcanza el nivel, el servidor no le entrega el resto del artículo. Esto protege el contenido aunque inspeccione las peticiones del navegador.

**Aviso de login.** Para acciones personales, mostrar una ventana corta con «Para guardar este resaltado, necesitas iniciar sesión. ¿Quieres hacerlo ahora?», botones «Iniciar sesión» y «Seguir leyendo», y mantener la lectura actual si cancela. Tras entrar, regresar a esa URL. El login existente parece llevar al panel de administración; se debe ajustar de forma segura y comprobar los roles antes de activar el aviso en acciones de lectores.

## 4. Modelo de datos propuesto

Nombres orientativos, sin cambios de Prisma en C1:

| Entidad | Campos esenciales | Regla |
|---|---|---|
| `AnnotationTarget` | `id`, `targetType`, `targetId`, fechas | Único por `(targetType, targetId)`; identifica el contenido mediante ID estable, nunca por slug |
| `ArticleParagraph` | `id`, `targetId`, `blockKey`, texto normalizado, revisión | Identidad del párrafo que el editor mantiene durante una corrección y reemplaza al borrar/recrear el párrafo |
| `ReaderHighlight` | `id`, `targetId`, `userId`, selector de texto, `exact`, fechas | Personal y privado; único por persona y pasaje; nunca se agrega a una respuesta pública |
| `ReaderNote` | `id`, `targetId`, `paragraphId?`, selector/cita opcionales, `userId`, `body`, `isPublic=false`, fechas | Nota educativa aparte; privada hasta que la autora la publique; hasta 2.500 caracteres |
| `BlogComment` (bloque D) | comentario raíz: `paragraphId?`, estado `ASSIGNED`/`UNASSIGNED`, selector/cita y copia del párrafo al escribir; respuestas ligadas al raíz | Conversación situada en un párrafo o en la sección inferior de hilos sin asignar; nunca pierde cita ni respuestas |
| `CommentThreadAssignmentLog` (bloque D) | raíz del hilo, actor editorial, párrafo anterior/nuevo, estado anterior/nuevo, fecha | Historial de cada reasignación; una operación en lote deja un registro por hilo afectado |
| `BlogPost` | `commentsEnabled`, `notesEnabled`, regla de acceso y cantidad de párrafos de vista previa (3) | Configura las funciones y el muro de ese post |

El texto marcado de forma personal guarda su selector por frase. Notas y comentarios guardan el párrafo al que pertenecen; conservar también la cita concreta es útil para explicar por qué se escribió una nota o comentario. En C2 solo se persiste contenido de blog. Libros y lecciones podrán añadir adaptadores cuando se definan sus modelos.

`blockKey` es un identificador guardado dentro del bloque del artículo, no un número de línea ni el texto del párrafo. El editor debe conservarlo al corregir el párrafo. El guardado reconoce bloques borrados y versiones anteriores; la interfaz administrativa permitirá reasignar hilos seleccionados en lote. Cada acción ofrece como destino un párrafo vigente o «Dejar sin asignar». La segunda opción los mantiene en la sección inferior con la copia de versión y la cita original. Al recrear un párrafo desde cero recibe una clave nueva.

La herramienta editorial trabaja con hilos raíz: elegir un hilo mueve el comentario inicial y todas sus respuestas como una unidad. La selección múltiple aplica el destino elegido a todos los hilos marcados del mismo post; la pantalla resume cuántos se moverán y permite revisar la operación antes de guardar. La operación se aplica completa o no se aplica, y registra actor, fecha, destino anterior y nuevo para cada hilo. Solo ADMIN y COLABORADOR con acceso editorial al blog pueden reasignar; no se modifican autor, texto, fecha ni cita del comentario.

Índices: párrafos por destino y clave única; resaltados privados por usuario/destino; notas por `(userId, targetId, createdAt, id)` y notas públicas por destino/fecha; comentarios por párrafo/fecha e hilos por comentario raíz. El icono cuenta comentarios y respuestas según el contrato existente; no calcula intersecciones entre resaltados.

No borrar notas ni comentarios al editar un artículo. Al retirar un post completo, ocultar su contenido de las rutas públicas y conservar sus aportes mientras exista la cuenta. La eliminación explícita de una cuenta sí elimina sus notas y resaltados mediante las relaciones de usuario; es distinta de editar o retirar un artículo.

### Identidad compartida y concurrencia

Cada resaltado personal pertenece solo a quien lo creó. Si dos personas seleccionan la misma frase o frases solapadas, cada quien ve su propia selección y marcas; nadie ve el marcado ajeno. Por ello no hace falta compartir identidad ni calcular lectores distintos para cada tramo. El contador público pertenece a la conversación del párrafo y cuenta comentarios/respuestas.

Cada interacción pública apunta a un `blockKey` del párrafo. La cita guardada sirve de contexto dentro del comentario o nota; no crea un resaltado visible para otros lectores.

## 5. Anclaje y contadores

Guardar siempre `{ exact, prefix, suffix, start, end }`. `start/end` son pistas; primero se verifica la cita y después se busca por texto y contexto, igual que en `lib/annotations.js`. Un cambio de HTML que conserve el texto normalizado no debe desplazar todas las marcas.

Mantener exactamente la normalización actual: espacios admitidos, límites de bloques y etiquetas omitidas. No sustituirla por una expresión regular sobre HTML. El algoritmo usa índices de cadenas JavaScript, por lo que los offsets son unidades UTF-16; incluir emojis en las pruebas. Versionar esta convención. Si se necesita intercambio W3C estricto, requerirá un adaptador explícito: el modelo actual es una adaptación del par de selectores de [W3C Web Annotation](https://www.w3.org/TR/annotation-model/#selectors), no una promesa de conformidad completa.

Propuesta técnica para C2: reutilizar la lógica del resolver en un núcleo probado que puedan ejecutar navegador y backend sobre el cuerpo saneado del artículo. Cualquier extracción debe conservar las exportaciones actuales; no mantener dos algoritmos que puedan divergir. La revisión del texto normalizado permite comprobar que cliente y servidor están resolviendo la misma versión.

Anclas ya guardadas que no resuelvan se conservan. Para una selección nueva enviada desde una versión antigua que ya no pueda localizarse, devolver `409 CONTENT_CHANGED` y conservar el borrador en pantalla; no guardar una posición inventada ni descartar una nota existente.

Las notas privadas no aparecen a otros lectores. Las notas públicas salen en una sección propia del post y en el perfil; una nota general (sin párrafo) también puede salir en esa lista. Se muestra la cita si tiene selector y la etiqueta del autor. Comentarios permanecen en su sección de conversación.

## 6. API: contrato existente y ampliaciones propuestas

### Notas — rutas ya documentadas

| Método y ruta | Respuesta | Acceso |
|---|---|---|
| `GET /api/blog/:slug/notes` | `200 { notes }` | Solo notas privadas del lector autenticado |
| `GET /api/blog/:slug/public-notes?page=&limit=` | `200 { notes, total, page, totalPages }` | Notas publicadas; la misma lista se une al perfil en G |
| `POST /api/blog/:slug/notes` | `201 { note }` | Crea una nota propia |
| `PATCH /api/notes/:id` | `200 { note }` | Edita `body` y/o `isPublic` de la propia |
| `DELETE /api/notes/:id` | `200 { deleted: true }` | Borra la propia |

Entrada propuesta de creación: `{ body, paragraphId: id | null, anchor: selectorCompleto | null, isPublic }`. Mantiene `anchor` del contrato actual como la cita seleccionada, y añade el párrafo estable. `PATCH` cambia `body` y/o `isPublic`, no el párrafo ni la cita. Si el post tiene desactivadas las notas, las operaciones de notas fallan aunque se llame la API directamente.

Salida propuesta: `{ id, body, paragraphId: id|null, paragraphStatus, anchor: string|null, selector: object|null, isPublic, createdAt, updatedAt, author: { name } }`. Conservar la cita literal y el selector original; adjuntar la copia del párrafo si quedó huérfano. No inventar pronombres ni avatar inexistentes.

Mantener `{ notes }` para las notas propias y orden descendente por fecha e ID. Notas públicas tienen paginación, necesaria para leerlas bajo el post; paginación de todas las notas del perfil corresponde a G.

### Resaltados — rutas propuestas, aún no existentes

| Método y ruta | Respuesta | Acceso |
|---|---|---|
| `GET /api/blog/:slug/highlights` | `200 { highlights }` | Solo los resaltados del lector autenticado |
| `POST /api/blog/:slug/highlights` | `201 { highlight }`; reintento propio devuelve el mismo | Autenticado; entrada `{ selector }` |
| `DELETE /api/blog/:slug/highlights/:id` | `200 { deleted: true }` | Retira solo el resaltado propio; repetición segura |

`highlight` incluye `{ id, selector }`. La respuesta nunca se comparte en caché y no existe endpoint público de marcas personales.

Los comentarios por párrafo y el contador del icono pertenecen al contrato del bloque D. Solo devuelve la cita seleccionada y el comentario público. Nunca expone el selector privado del usuario ni sus resaltados.

### Acceso al artículo

La ruta pública `GET /api/blog/:slug` debe comprobar antes de devolver el cuerpo: estado publicado, regla `PUBLIC`/`ACCOUNT`/`MEMBERSHIP_TIER` y membresía activa del lector. Sin acceso, devuelve solo metadatos públicos, regla y tres párrafos de vista previa, no el HTML completo ni fragmentos alternos en el mismo JSON. API de artículo, render del servidor, HTML inicial, metadatos y caché deben seguir la misma regla. No basta con cubrir el texto en CSS o JavaScript.

Quien inicia sesión regresa al artículo solicitado mediante una ruta de retorno local validada; si la URL no es válida, usa el perfil público. Nunca aceptar una URL externa como destino de retorno. El login actual tiene apariencia y redirección al panel de administración; verificar compatibilidad de CLIENT antes de usarlo para el blog. El aviso ofrece «Iniciar sesión» y «Seguir leyendo»; el segundo lo cierra sin navegar.

Notas y escrituras de resaltados reutilizan `authenticateToken`. Ser ADMIN o COLABORADOR no permite leer notas privadas ajenas ni borrarlas. No exigir permiso editorial `blog` a un lector CLIENT. Mantener las restricciones de cuenta existentes; probar los roles como lectores de sus propios datos.

Respuestas personales sin caché compartida. Usar la cookie y las cabeceras de `authFetch`, incluida la protección existente `X-Requested-With`. Usuario propietario, contadores y `mine` se calculan en servidor; no se aceptan del cuerpo de la solicitud.

Validación: nota de texto plano de 1–2.500 unidades UTF-16 tras comprobar que contiene texto; cita de 1–10.000; contexto hasta 32 por lado; posiciones enteras no negativas con `end > start`; `isPublic` booleano. El servidor determina el párrafo del artículo a partir de la selección. La interfaz muestra «N de 2.500», cambia el contador a rojo al exceder el límite y bloquea guardar hasta corregirlo. El servidor aplica el mismo máximo; no trunca contenido. Comentarios tienen un límite por decidir y no heredan el de las notas.

Errores: `400` entrada malformada, `401` sin sesión válida, `403` restricciones de cuenta, `404` recurso inaccesible o nota de otra persona, `409` revisión incompatible. Una ruta personal no revela si existe una nota ajena. Eliminar una nota solo puede afectar a la fila del propietario; la semántica de repetición no debe permitir enumerar notas privadas.

Para reintentos de creación de notas, proponer una clave de idempotencia por envío, acotada al usuario/destino y comprobada contra el contenido; no deduplicar notas diferentes por tener el mismo texto. Evitar dobles envíos en la interfaz por sí solo no resuelve una respuesta perdida.

## 7. Conexión prevista en C2

- `lib/notes.js`: lectura y escrituras reales, con el contrato anterior.
- Nuevo módulo de acceso a resaltados, separado de `lib/highlights.js`: obtiene y cambia solo las marcas personales del lector.
- `BlogPostView`: estado personal local, nota y comentario dirigidos a párrafos, aviso de login sin teletransporte y vuelta segura al artículo.
- `BlogNotesPanel`, `BlogNote`, `BlogMarginNotes`: recibir selector y párrafo estables, contador de 2.500 caracteres y lectura aparte de notas públicas; las públicas se muestran en sección propia.
- Bloque D: iconos/contadores públicos por párrafo, conversaciones y respuestas, cita que cada comentario seleccionó y sección inferior para hilos sin párrafo vigente.
- Edición CMS del post: configurar acceso y presencia de notas/comentarios; preservar identificadores de párrafo al corregir, guardar copias de versiones necesarias y ofrecer selección de hilos, reasignación individual o en lote, destino alternativo y «Dejar sin asignar».
- `BlogPostBody`: marca personal no pública sobre la selección del lector. No pintar resaltados de otros.
- Backend: servicios y controles que hagan cumplir acceso, funciones activadas, propiedad privada, notas públicas y consistencia del párrafo.
- Flags de notas/resaltados: ambos deben seleccionar la fuente desde sus módulos. Ningún componente debe llamar directamente a la maqueta. El modo de demostración no escribirá en la API real ni se presentará como persistente.
- El coste operativo esperado de mostrar notas/comentarios por párrafo es bajo en una carga normal: son filas e índices de base de datos, lectura paginada y recuentos por lote; no requiere un servicio externo. El costo mayor es construir y mantener el editor de IDs de párrafo, la vista de versiones para hilos retirados, el paywall y los permisos por post. Sin métricas de tráfico no se puede prometer una cifra exacta; conviene medir consulta y caché durante pruebas de carga.

## 8. Verificación exigida para C2

1. Guardar, recargar, editar y borrar una nota propia; conservar el borrador ante error. Nota general sin marca en el margen.
2. Ausencia de sesión, sesión expirada/inactiva y roles existentes; ningún usuario obtiene notas privadas ajenas por listados, IDs, anclas, contadores o caché.
3. Cada lector ve solo sus propios resaltados; dos selecciones iguales/superpuestas no se filtran entre cuentas y no cambian contador público.
4. Corrección ortográfica preserva `blockKey`, icono y conversación. Borrar/recrear párrafo archiva hilo completo y conserva la cita y copia del bloque; reasignar individualmente o en lote mueve raíz y respuestas juntas. «Dejar sin asignar» conserva el hilo en la sección inferior.
5. Reasignación permitida solo al personal editorial autorizado; operación en lote muestra el alcance, se guarda toda o ninguna y registra cada hilo afectado. No altera autoría ni textos.
6. Notas privadas no aparecen a otros; publicar/retirar actualiza apartado del artículo y perfil. Post con notas/comentarios desactivados rechaza también las llamadas API.
7. Posts públicos, de cuenta y de nivel: invitado recibe como máximo tres párrafos; inspeccionar fuente, HTML inicial, JSON y caché no revela el resto. Usuario con y sin el nivel correcto recibe el contenido apropiado.
8. Contador de nota en 2.499, 2.500 y más de 2.500; interfaz avisa y bloquea; API acepta/rechaza lo mismo y no trunca. Comentarios se prueban con su límite aún por definir.
9. Cambio de sesión/post con peticiones pendientes, errores y reintentos; acceso a posts y llamadas cuando una función esté desactivada.
10. Pruebas de integración con PostgreSQL; luego `npm run check` en backend y compilación del sitio.

Antes de verificar contra la base real hay que revisar la activación pendiente de B: la generación de Prisma quedó bloqueada por Windows y el esquema relacional no se aplicó en el turno anterior. Este diseño no afirma que ese bloqueo siga activo ni que se haya resuelto. C2 debe comprobarlo y coordinar un reinicio del proceso concreto si fuera necesario, sin interrumpir procesos desconocidos.

## 9. Decisiones acordadas y pendientes

Estas preferencias ya fueron confirmadas para orientar el diseño. La implementación sigue pendiente. Los puntos marcados como pendientes aún requieren resolver arquitectura o revisar los sistemas existentes.

| Tema | Dirección acordada | Consecuencia |
|---|---|---|
| Visibilidad del resaltado | Solo su autor lo ve marcado; los demás ven conversación por párrafo | Evita llenar el texto con marcas ajenas; la cita seleccionada aparece en cada comentario |
| Notas públicas | Apartado propio dentro del post y perfil; concepto educativo distinto a comentarios | Hace falta leerlas y paginarlas en ambos lugares |
| Funciones por post | Elegir ambas, solo notas, solo comentarios o ninguna | CMS guarda la opción y API la obliga |
| Preview de artículo de acceso limitado | Etiqueta visible y tres párrafos antes del muro | API y servidor nunca mandan el cuerpo restringido al visitante |
| Límite de nota | 2.500 caracteres; contador, aviso rojo y bloqueo de envío al exceder | Cliente y servidor verifican el mismo tope; límite de comentarios sigue pendiente |
| Edición sencilla | ID estable mantiene los hilos ante correcciones dentro del mismo párrafo | No hay que revisar conversación por conversación para corregir ortografía |
| Párrafo eliminado | Hilo completo pasa al final con cita, copia de párrafo y aviso de versión anterior | No se pierde; pierde posición dentro del artículo vigente |
| Reasignar hilos | Función prevista: seleccionar uno o varios hilos completos, elegir otro párrafo o «Dejar sin asignar» | Conserva la conversación entera y facilita corregir el contexto; suma interfaz editorial, control de acceso e historial por hilo |

**Pendiente de revisar antes de implementar:** de dónde viene la membresía/tier real y cómo se concede/revoca; el esquema actual no permite asumir que `discountTier` sea acceso editorial. La reasignación individual y por lote con opción «Dejar sin asignar» queda incluida en el diseño del bloque D, no solo como idea para el futuro.

La eliminación explícita de cuentas borra sus notas y resaltados; conservarlos al editar o retirar un artículo no cambia ese resultado.

**Punto de parada:** C2 termina con las anotaciones del blog. La integración de comentarios por párrafo, reasignación de hilos, notas en el perfil y acceso por membresía siguen pendientes en sus bloques correspondientes. No iniciar D sin una nueva orden.
