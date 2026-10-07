# Migraciones Prisma

## Estado actual

La línea base `migrations/0_init` existe en el repositorio y representa el esquema de `schema.prisma` anterior a T002. En T003, el 2026-10-05, la comparación con Supabase no detectó diferencias y se registró `0_init` como aplicada, tras las aprobaciones de Eny. Ese mismo día se aplicó únicamente `1_commissions_waitlist`. La comprobación del 2026-10-06 confirmó que Prisma está al día.

Los SQL históricos están archivados en `legacy-sql/`. No se ejecutan ni se editan. T003 confirmó que el esquema existente coincidía con la línea base; no fue necesario ejecutar ninguno de los SQL históricos. Esto no reconstruye su historial individual de aplicación.

## Flujo permitido

1. Editar `schema.prisma`.
2. En Git Bash y desde `backend/`, recuperar el esquema del último commit con migración:
   ```bash
   git show <SHA_del_ultimo_commit_con_migracion>:backend/prisma/schema.prisma > /tmp/base.prisma
   ```
3. Crear el directorio de la migración y generar el SQL entre los dos esquemas, sin conexión:
   ```bash
   mkdir -p prisma/migrations/<N>_<nombre>
   env DATABASE_URL='postgresql://invalid:invalid@127.0.0.1:1/invalid' DIRECT_URL='postgresql://invalid:invalid@127.0.0.1:1/invalid' \
     npx prisma migrate diff --from-schema-datamodel /tmp/base.prisma --to-schema-datamodel prisma/schema.prisma --script -o prisma/migrations/<N>_<nombre>/migration.sql
   ```
4. Revisar el SQL y comprobar que es UTF-8 sin BOM ni caracteres `\r`.
5. Crear el commit con el esquema y la migración.
6. Aplicar únicamente con `npx prisma migrate deploy`, con autorización humana y backup previo verificado.

## Operaciones prohibidas contra Supabase

No usar `migrate dev`, `migrate reset`, `db push`, `db pull` sobre el esquema, `--accept-data-loss`, `--force-reset` ni SQL ad hoc.

No usar redirección `>` en PowerShell: puede escribir UTF-16. Para generar SQL usar la opción `-o` de Prisma y Git Bash.

## Detección de deriva

Es una operación de solo lectura contra la base real y requiere autorización. No forma parte de T001 ni T002:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

El código de salida `0` significa que no hay diferencias, `2` indica deriva y `1` indica un error. Ante deriva, detenerse y revisar los nombres de los objetos con la persona responsable antes de actuar.

## Commissions y waitlist en Postgres

La migración `1_commissions_waitlist` crea `CommissionRequest` y `WaitlistEntry`, junto con tres índices. Las rutas conservan su contrato público y usan Prisma. El payload ya no puede sustituir los campos administrados por el servidor (`id`, `status`, `referenceFiles`, `receivedAt`, `updatedAt`). El orden de las llaves de `jsonb` no se conserva.

La importación de T003 se ejecutó tras el backup verificado y las aprobaciones del encargo. El primer `--apply` insertó 0 comisiones y 2 registros de waitlist, sin inválidos ni omitidos. Eny inició el backend local con el código nuevo en el puerto 3001 y confirmó que la instancia anterior estaba detenida. El segundo `--apply`, el 2026-10-06, insertó 0 registros y omitió los 2 IDs de waitlist ya existentes. El dry-run final informó 0 faltantes en ambas colecciones. Se conservan los JSON y uploads originales. Eny confirmó el funcionamiento del panel como ADMIN y aportó la medición inicial de R5 el 2026-10-06; T003 queda cerrada.

Los comandos siguientes requieren los gates, backups y aprobaciones del encargo de T003. No se ejecutan durante T001 o T002.

Desde `backend/`, el script `src/scripts/import-json-data.js` permite:

- `node src/scripts/import-json-data.js`: dry-run; valida sin escribir y lee únicamente los IDs para informar los faltantes en la base.
- `node src/scripts/import-json-data.js --apply`: importa las dos colecciones en una transacción, omitiendo IDs ya existentes. Se niega si hay registros inválidos.
- `--skip-invalid`: solo con autorización humana; permite omitir registros inválidos durante la importación.
- `--commissions-file <ruta>` y `--waitlist-file <ruta>`: sobrescriben las rutas de lectura; por defecto se usan los JSON de `backend/data/`.
- `node src/scripts/import-json-data.js --export-to-json <directorio_nuevo>`: exporta los dos JSON en formato legado. Se niega si el directorio ya existe.

El script informa conteos, IDs y códigos de error; no imprime nombres, emails ni payloads. No modifica los JSON de origen ni los uploads. Importarlo como módulo no carga variables de entorno, el cliente real ni los archivos de datos.

Revertir el código no recupera los datos creados en Postgres. Antes de revertir hay que ejecutar `--export-to-json` y reemplazar los JSON de forma manual, con custodia adecuada de los datos personales.

El RLS de `CommissionRequest` y `WaitlistEntry` se activa desde el Dashboard de Supabase antes de importar (gate G7), fuera de Prisma: `schema.prisma` no refleja esas políticas y el backend se conecta como `postgres`, que se las salta. El ejecutor no aplica SQL de RLS.

Eny confirmó «RLS activado» en ambas tablas el 2026-10-05, antes de la primera importación.

Medición inicial R5 comunicada por Eny el 2026-10-06: máximo y promedio de `pg_column_size(payload)` en `CommissionRequest` fueron NULL, coherente con la tabla vacía; `WaitlistEntry` tuvo 2 registros. El conteo de comisiones es 0 por los agregados NULL sobre un payload obligatorio (`JSONB NOT NULL`); Eny no transcribió ese COUNT por separado. La solicitud de comisiones en Network mostró 4,3 kB y 63 ms, según la medición de Eny. El umbral para un futuro trabajo de paginación queda por definir por Eny.

Con el plan Free de Supabase, el proyecto se pausa si no tiene actividad suficiente durante una semana (https://supabase.com/docs/guides/platform/free-project-pausing). Pausado, POST /api/commissions y /api/waitlist fallarán. Atiende el correo de aviso de Supabase y reactiva el proyecto desde el Dashboard. No existen backups automáticos: repite el Paso 1 de T003 o ejecuta `--export-to-json` periódicamente.
