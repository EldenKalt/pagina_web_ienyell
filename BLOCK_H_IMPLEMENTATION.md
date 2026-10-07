# Bloque H — suscripción al boletín

## Entregado

- El formulario del blog deja de usar respuestas simuladas y llama a `POST /api/newsletter/subscribe`.
- El servidor valida el correo, limita peticiones por dirección (15 minutos) y por IP, y envía un correo de confirmación con enlace firmado válido durante 24 horas. Solo la confirmación activa la suscripción.
- `/newsletter/confirm` permite confirmar con un botón. El enlace solo puede usarse una vez.
- El correo incluye una opción de baja. `/newsletter/unsubscribe` muestra primero la acción y la baja se realiza por `POST`, para que abrir o previsualizar el enlace no cambie la suscripción. Repetir la baja es seguro.
- El registro conserva cuándo se confirmó o se dio de baja. Una persona dada de baja puede solicitar una suscripción nueva, que requiere otra confirmación.
- La respuesta pública es la misma para una dirección nueva, pendiente o ya activa. El contrato antiguo proponía `409` para duplicados, pero también pedía no revelar qué correos están inscritos. Se eligió la respuesta neutra `201` para proteger esa información; el propio correo informa a quien controla la dirección. `400` indica correo mal formado, `429` exceso de peticiones y `503` fallo temporal del envío.

## Puesta en marcha

`backend/prisma/newsletter-h.sql` crea la tabla. Se aplica después de los SQL anteriores del blog, incluido G. **No se aplicó a ninguna base de datos en esta iteración.** El cliente Prisma local ya se regeneró con `NewsletterSubscriber`. El servidor usa `NEWSLETTER_TOKEN_SECRET` si está configurado y, si no, el `JWT_SECRET` existente; conservar ese secreto es necesario para que los enlaces sigan siendo válidos. El servidor usa `FRONTEND_URL` para construir los enlaces y la configuración SMTP existente para enviar los correos.

La suscripción y la baja quedan preparadas. Enviar campañas o avisos automáticamente al publicar un artículo **no forma parte de este bloque**; cualquier envío futuro debe incluir el enlace de baja individual.

## Comprobación

Se prueban validación, confirmación, uso único del enlace, respuesta neutra, enfriamiento, baja y recuperación tras fallo de correo con dependencias simuladas. La compilación del sitio y la validación del esquema no sustituyen una prueba con SMTP y base de datos reales.
