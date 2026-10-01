# Seed Admin User — Prompt

Crea `backend/prisma/seed-admin.js` — un script que crea (o actualiza) un usuario ADMIN en la base de datos.

## Requisitos técnicos exactos:

1. **Imports**:
   - `{ PrismaClient }` de `@prisma/client`
   - `bcrypt` de `bcrypt`

2. **Variables al inicio del archivo** (el usuario las edita antes de correr):
   ```js
   const ADMIN_EMAIL = 'enyell@ienyell.com';
   const ADMIN_PASSWORD = 'admin1234';
   const ADMIN_NAME = 'Enyell';
   ```

3. **Lógica** (función `main` async, auto-invocada):
   - Instanciar `new PrismaClient()`
   - Hashear el password: `await bcrypt.hash(ADMIN_PASSWORD, 10)`
   - Usar `prisma.user.upsert()`:
     - `where: { email: ADMIN_EMAIL }`
     - `update: { passwordHash, name: ADMIN_NAME, role: 'ADMIN' }`
     - `create: { email: ADMIN_EMAIL, passwordHash, name: ADMIN_NAME, role: 'ADMIN' }`
   - Imprimir en consola: `✓ Admin user created/updated: <email>`
   - En el `finally`: `await prisma.$disconnect()`
   - Catch de errores con `console.error` y `process.exit(1)`

4. **NO agregar** nada más: ni dotenv (Prisma lo carga solo), ni validaciones extras, ni prompts interactivos.

5. **Agregar script a `backend/package.json`**:
   ```json
   "seed:admin": "node prisma/seed-admin.js"
   ```

## Archivo a crear:
| Archivo | Contenido |
|---------|-----------|
| `backend/prisma/seed-admin.js` | Script seed para crear usuario ADMIN |

## Archivo a modificar:
| Archivo | Cambio |
|---------|--------|
| `backend/package.json` | Agregar `"seed:admin"` en scripts |

## Uso:
```bash
cd backend
npm run seed:admin
```

El usuario debe editar `ADMIN_EMAIL`, `ADMIN_PASSWORD`, y `ADMIN_NAME` en el archivo antes de correrlo. Después de ejecutar, puede hacer login en `http://localhost:3000/admin` con esas credenciales.
