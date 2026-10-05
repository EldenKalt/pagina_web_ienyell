# Bloque D — conversaciones del blog

El artículo muestra un icono junto a cada párrafo que tenga conversación. El número cuenta comentarios y respuestas. El color del resaltado permanece personal; los demás lectores ven la cita seleccionada dentro del comentario, no marcas ajenas sobre el texto. Los comentarios generales aparecen en la lista del artículo. Las respuestas se cargan al abrir un hilo y se presentan en un solo nivel.

Cada comentario y respuesta admite 2.500 unidades UTF-16. El formulario muestra el contador, avisa en rojo al excederlo e impide enviar. La API exige sesión para escribir y aplica el mismo límite. La lectura es pública mientras el artículo esté publicado y tenga comentarios habilitados. El interruptor editorial de comentarios también cierra las rutas públicas y de escritura.

El identificador de párrafo sobrevive a correcciones dentro del mismo párrafo. Si el párrafo desaparece, el hilo completo pasa a la sección inferior de versiones anteriores con su cita y una copia del párrafo original. La herramienta del editor permite mover uno o varios hilos a un párrafo actual o dejarlos sin asignar; conserva todas las respuestas y registra cada cambio. Se guarda el fragmento y el párrafo original, no una copia navegable de todo el artículo antiguo.

Si se elimina la cuenta de quien comentó, el comentario y sus respuestas permanecen, y el autor se presenta como «Reader». La base de datos pone a `NULL` la referencia a la cuenta, también para quien hizo una reasignación editorial. Dar «me gusta» y reportar comentarios no se activan en D.

## Puesta en servicio

1. Aplicar primero el SQL de C2 en `backend/prisma/annotations-c2.sql` y después `backend/prisma/comments-d.sql` a la base de datos correspondiente, previa revisión del estado real de esa base.
2. Generar el cliente Prisma del backend y desplegar backend y frontend juntos. En esta máquina `prisma generate` está bloqueado por `EPERM` sobre `query_engine-windows.dll.node`; la validación del esquema, las pruebas y la compilación web sí pasan.
3. Probar en una base integrada: publicar, responder, corregir y retirar un párrafo, reasignar varios hilos y eliminar una cuenta con conversación existente.

Este bloque termina aquí. Guardar posts para leer luego corresponde a E; las notas y comentarios en el perfil corresponden a G.
