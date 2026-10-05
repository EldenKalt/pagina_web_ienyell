# Bloques E y F — guardar y reaccionar

E: «Guardar para leer más tarde» persiste por cuenta y artículo. Los controles del artículo comparten estado; al cerrar sesión se limpia la marca personal. La lista privada del perfil carga artículos reales por páginas. Las marcas de posts retirados permanecen en la base, pero no se ofrecen como lecturas públicas hasta que el post vuelva a publicarse.

F: cada cuenta puede dar o quitar un «me gusta» una vez a un post o comentario. Los contadores públicos se calculan con datos reales. «Compartir» usa el diálogo del sistema o copia el enlace; solo después de que esa acción termina se registra un evento en el contador. Por tanto, `shares` mide acciones de compartir iniciadas con éxito, no lecturas verificadas por terceros. El registro está limitado por IP. El control «Escuchar» continúa deshabilitado hasta que exista una narración.

Para activar E y F en una base real, aplicar en orden `backend/prisma/annotations-c2.sql`, `backend/prisma/comments-d.sql` y `backend/prisma/saved-and-reactions-ef.sql`, previa revisión del estado de esa base. Después, regenerar el cliente Prisma y desplegar frontend y backend juntos. En este equipo `prisma generate` sigue fallando por un bloqueo `EPERM` del DLL de Prisma. La migración E/F se contrastó con el diff de Prisma; validación del esquema, pruebas y compilación web pasan.

El resto del perfil (comentarios, notas y datos personales) pertenece al bloque G. Las cifras de «puntos» del perfil no se conectaron a las reacciones porque sus reglas siguen sin definir.
