# Bloque G — perfil del lector

## Entregado

- `/users/profile` deja de usar actividad y puntos inventados. Lee notas, comentarios, resaltados, artículos guardados y lista de deseos reales de la cuenta con sesión. Las listas de actividad son paginadas.
- «What others see» consulta las rutas públicas con la identidad de la cuenta actual: muestra exactamente las notas publicadas y los comentarios que recibiría otra persona. Los escritos privados, resaltados, artículos guardados, lista de deseos y correo no aparecen allí.
- `/users/[handle]` ofrece un perfil público con alias elegido por la persona, pronombres y enlaces HTTPS. Un alias anterior redirige al vigente tras cambiarlo. Los alias siguen reservados para su propietario y no se reasignan a otra cuenta.
- Los listados públicos excluyen los escritos de artículos retirados o con notas/comentarios deshabilitados. El propietario conserva sus escritos, incluso si el artículo fue retirado, con su cita y sin enlace roto.
- La lista de deseos permite buscar productos activos, añadirlos y quitarlos. Conserva a la vista productos que dejaron de estar disponibles. Los importes del catálogo se presentan en colones, como en el checkout actual.
- El servidor valida alias, pronombres, enlaces y paginación. Las rutas privadas se vinculan a la identidad de la sesión y no aceptan un ID de otra persona.

## Puesta en marcha

`backend/prisma/reader-profile-g.sql` contiene los cambios de base de datos de G. Se aplica **después de** `annotations-c2.sql`, `comments-d.sql` y `saved-and-reactions-ef.sql`. Los SQL no se han aplicado a ninguna base de datos. El cliente Prisma local ya se regeneró y contiene los modelos de G; las rutas nuevas aún necesitan las tablas y columnas correspondientes en la base real.

## Pendiente por decisión de producto

- Historial de artículos leídos: hay que decidir qué acción cuenta como «leído» y si el lector puede ocultar ese historial. Guardar para leer más tarde no demuestra que se haya leído.
- Puntos: no se muestra una cifra hasta definir cómo se ganan y para qué sirven.
- Paneles por compras, cursos, ejercicios, comentarios de la profesora, notificaciones y silenciamiento de conversaciones pertenecen a etapas posteriores.

## Comprobación

La validación de Prisma, los tests del backend y la compilación del frontend se ejecutan sobre código y esquemas locales. No equivalen a una prueba de integración con la base de datos desplegada.
