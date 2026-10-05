# Migraciones Prisma

## Estado actual

La línea base `migrations/0_init` existe en el repositorio y representa el esquema de `schema.prisma` anterior a T002. No está marcada como aplicada en ninguna base de datos. El diagnóstico de la base real y la adopción de la línea base están pendientes de T003.

Los SQL históricos están archivados en `legacy-sql/`. No se ejecutan ni se editan; no se conoce su estado de aplicación en la base real.

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
