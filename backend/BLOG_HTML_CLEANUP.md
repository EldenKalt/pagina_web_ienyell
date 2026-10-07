# Bloque A — saneado del HTML del blog

Crear y actualizar `content` aplica DOMPurify con jsdom antes de validar y
guardar. Se conservan los defaults de DOMPurify y las extensiones exactas de
`ARTICLE_HTML_ALLOWANCES` en `lib/articleHtml.js`; una prueba comprueba su
compatibilidad. Se rechaza contenido que queda vacío al sanearlo. El slug
`archive`, explícito o generado, está reservado.

No cambia el esquema Prisma ni la estrategia de migraciones del proyecto.
La herramienta limpia únicamente `BlogPost.content`, tanto borradores como
publicados. No elimina posts ni modifica publicación, autor o slug; Prisma
actualiza `updatedAt` al guardar un cambio. Puede ejecutarse varias veces.

## Datos existentes

Ejecutar desde `backend/`, contra la base definida por `DATABASE_URL`:

1. Desplegar primero el saneado al guardar. Si es posible, detener temporalmente
   las ediciones durante la limpieza para reducir conflictos.
2. Crear y comprobar una copia de seguridad de la base por el procedimiento
   habitual del entorno. Conservarla fuera del repositorio y del registro de
   ejecución: puede contener HTML inseguro y datos privados.
3. Revisar sin guardar: `npm run jobs:sanitize-blog -- --dry-run`.
   La salida contiene únicamente modo y conteos; `changed` incluye tanto
   retiradas por seguridad como normalización del HTML por el parser.
4. Aplicar: `npm run jobs:sanitize-blog -- --apply`.
   Se procesa por lotes y cada escritura exige que el contenido aún coincida
   con el leído. Una edición o eliminación concurrente cuenta como conflicto;
   el proceso devuelve código 1 si hubo conflictos. Ante fallo, puede haber
   cambios parciales: resolver el problema y repetir el proceso.
5. Repetir `--dry-run`: debe terminar con código 0 y `changed: 0`.
   Revisar en el editor algunos artículos con tablas, imágenes y vídeos.
6. Reanudar ediciones. Las rutas públicas del blog ya usan el backend. La página
   confía en el HTML de la API solo tras su saneado en el backend y la revisión de
   las filas previas.

La revisión es el modo por defecto si no se proporciona ningún argumento.
Un error, conflicto o revisión incompleta impide dar la base por saneada.
La limpieza no imprime HTML, direcciones, credenciales ni datos de usuarios.
Mantener las dependencias de saneado actualizadas; jsdom 29.1.1 es compatible
con Node 24.14 usado al verificar este bloque.

La revisión realizada para este checkout el 2 de octubre de 2026 devolvió
`scanned: 0` y `changed: 0`; revisa cada base de datos antes de conectarla a la
lectura pública.
