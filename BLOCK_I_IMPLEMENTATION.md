# Bloque I — datos del artículo y del autor

## Implementado

- El tiempo de lectura se estima a partir del texto actual, a 200 palabras por minuto y redondeando hacia arriba. Se excluyen etiquetas, scripts y contenido oculto; no incluye el tiempo de vídeos o ejercicios. No añade una columna que pueda quedar desactualizada tras editar.
- Listas, recomendaciones, series y artículos guardados reciben la estimación. Los listados no reciben el texto completo que se usó para calcularla. Las series también reciben los contadores reales.
- Las fichas del autor reciben pronombres y enlaces guardados en el perfil. La respuesta pública selecciona únicamente campos públicos.
- Se añaden biografía y URL de Patreon. En `/users/profile`, los administradores y colaboradores con permiso `blog` pueden editarlas. El servidor aplica el mismo permiso, un máximo de 1.500 caracteres para la biografía y un enlace HTTPS de Patreon.
- Se retiran las cifras de lectores y seguidores, para las que todavía no existe una medición. El botón Patreon aparece solo cuando tiene un destino real.

## Cursos — bloque J pendiente

El documento no define todavía lecciones, acceso, compras ni progreso. Se ocultaron el enlace «Learn» y las tarjetas de cursos inventados bajo los artículos. La maqueta permanece en el proyecto para un diseño posterior; esto no implementa un catálogo ni una plataforma de cursos.

## Comprobaciones

- Backend: validación del esquema, lint y 91 pruebas aprobadas.
- Frontend: compilación de producción aprobada.
- Cliente Prisma regenerado con los campos nuevos; servidor de desarrollo reiniciado.
- Las pruebas nuevas cubren extracción del texto, protección de datos en listados, permisos para editar datos de autor y validación de Patreon.

## Puesta en marcha

La lista inicial omitía el requisito de series. Para una base que ya tiene `BlogPost`, pero aún no tiene las series ni los cambios C2–I, el orden es:

0. `backend/prisma/blog-series.sql`
1. `backend/prisma/annotations-c2.sql`
2. `backend/prisma/comments-d.sql`
3. `backend/prisma/saved-and-reactions-ef.sql`
4. `backend/prisma/reader-profile-g.sql`
5. `backend/prisma/newsletter-h.sql`
6. `backend/prisma/author-fields-i.sql`

El 5 de octubre de 2026 se confirmó que los cambios C2–I ya estaban presentes en la base configurada, pero faltaban `BlogPost.seriesId`, `BlogSeries` y `BlogSeriesFeaturedPost`. Se aplicó únicamente `blog-series.sql`, con sus índices y relaciones, dentro de una transacción. Este archivo también puede aplicarse después de C2–I cuando las series todavía no existen. No volver a ejecutar los SQL ya aplicados.

La generación de Prisma no crea estas tablas ni columnas. En otra base hay que comprobar primero qué cambios existen. El SQL de series se contrastó con el SQL generado por Prisma. No se enviaron correos reales.

Comprobación posterior: existen los ocho índices (incluidas claves primarias) y las cuatro relaciones esperadas para series; `/api/blog?page=1&limit=24` y `/api/blog/topics` responden 200. `/blog` responde 200 y ya no muestra el error de carga. La base consultada contiene cero artículos; no se añadieron publicaciones de prueba. `npm run check` del backend pasó: lint, esquema válido y 91 pruebas.

También siguen pendientes las reglas del historial de lecturas, los puntos, el acceso por membresía y los envíos automáticos del boletín al publicar artículos. Están separados del trabajo de metadatos completado aquí.
