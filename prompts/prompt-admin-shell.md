# Admin Shell & Auth — Migration Prompts

Estos prompts crean el sistema de autenticación y el shell admin (layout con navegación) para ienyell. El backend ya tiene todas las rutas: `/api/auth/login`, `/api/auth/register`, `/api/auth/google`, `/api/auth/logout`, `/api/auth/check`, `/api/auth/me`. Todo es cookie-based (`withCredentials: true`).

**ienyell es mucho más simple que Util** — solo tiene 2 secciones admin (Portfolio y Blog), no tiene Google OAuth, no tiene roles múltiples (solo ADMIN), no tiene notificaciones, no tiene sidebar colapsable, no tiene tickets/mensajes. Es un panel de ilustradora.

**Ejecutar en orden: 1 → 2 → 3 → 4.**

---

## Prompt 1 — AuthContext (proveedor de autenticación)

Crea `context/AuthContext.js` — el contexto de autenticación para toda la app.

### Requisitos técnicos exactos:

1. **Directiva**: `'use client'`
2. **Imports**: `{ createContext, useContext, useCallback, useEffect, useState }` de `react`
3. **Import interno**: `{ authFetch, getApiBase }` de `../lib/authHelper`

4. **Crear el contexto**: `const AuthContext = createContext(null)`

5. **`AuthProvider` component** (named export):
   - **State**: `user` (object | null), `isLoading` (boolean, inicia `true`)
   - **useEffect on mount** — validar sesión existente:
     ```js
     useEffect(() => {
       let cancelled = false;

       async function checkSession() {
         try {
           const data = await authFetch('/api/auth/check');
           if (!cancelled) setUser(data.user || data);
         } catch {
           if (!cancelled) setUser(null);
         } finally {
           if (!cancelled) setIsLoading(false);
         }
       }

       checkSession();
       return () => { cancelled = true; };
     }, []);
     ```
   - **`login(email, password)`** (async):
     ```js
     const apiBase = getApiBase();
     const response = await fetch(`${apiBase}/api/auth/login`, {
       method: 'POST',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
       body: JSON.stringify({ email, password }),
     });
     if (!response.ok) {
       const err = await response.json().catch(() => ({}));
       throw new Error(err.error || err.message || 'Login failed');
     }
     const data = await response.json();
     const userData = await authFetch('/api/auth/me');
     setUser(userData.user || userData);
     return userData;
     ```
   - **`logout()`** (async):
     ```js
     try {
       await authFetch('/api/auth/logout', { method: 'POST' });
     } catch { /* ignore */ }
     setUser(null);
     ```
   - **`refreshUser()`** (async):
     ```js
     const data = await authFetch('/api/auth/me');
     setUser(data.user || data);
     return data.user || data;
     ```
   - **Provider value**: `{ user, isLoading, login, logout, refreshUser }`
   - Render: `<AuthContext.Provider value={value}>{children}</AuthContext.Provider>`

6. **`useAuth` hook** (named export):
   ```js
   export function useAuth() {
     const context = useContext(AuthContext);
     if (!context) throw new Error('useAuth must be used within AuthProvider');
     return context;
   }
   ```

### Archivo a crear:
| Archivo | Contenido |
|---------|-----------|
| `context/AuthContext.js` | AuthProvider + useAuth hook, cookie-based |

### Notas:
- **NO incluir** Google OAuth — ienyell no lo necesita por ahora.
- **NO incluir** `register` — el registro se hace manualmente o se agrega después.
- **NO incluir** roles múltiples — solo ADMIN accede al panel.
- Auth es 100% cookie-based. No hay tokens en localStorage.

---

## Prompt 2 — Login Page (`app/users/login/page.js`)

Crea `app/users/login/page.js` — la página de login para acceder al admin.

### Requisitos técnicos exactos:

1. **Directiva**: `'use client'`
2. **Imports**:
   - `{ useState }` de `react`
   - `{ useRouter }` de `next/navigation`
   - `{ useAuth }` de `../../../context/AuthContext`

3. **Componente** `AdminLoginPage` (export default):

4. **State**: `email` (string), `password` (string), `error` (string), `loading` (boolean)

5. **Redirect si ya autenticado**: Dentro del componente, verificar `useAuth()`. Si `user` existe y `!isLoading`, redirect a `/admin` con `router.replace('/admin')`. Mostrar null mientras `isLoading`.

6. **`handleSubmit(e)`** (async):
   - `e.preventDefault()`
   - Set loading, clear error
   - `await login(email, password)`
   - `router.replace('/admin')`
   - Catch: set error message

7. **Render**:
   ```jsx
   <main className="cms-login-page">
     <div className="cms-login-card">
       <h1 className="cms-login-title">ienyell</h1>
       <p className="cms-login-subtitle">Admin Panel</p>

       {error && <div className="cms-login-error" role="alert">{error}</div>}

       <form onSubmit={handleSubmit} className="cms-login-form">
         <label className="cms-login-label">
           Email
           <input
             type="email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             placeholder="your@email.com"
             className="cms-input"
             required
             autoFocus
             autoComplete="email"
           />
         </label>

         <label className="cms-login-label">
           Password
           <input
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             placeholder="••••••••"
             className="cms-input"
             required
             autoComplete="current-password"
           />
         </label>

         <button type="submit" className="cms-btn cms-btn-primary cms-login-submit" disabled={loading}>
           {loading ? 'Signing in…' : 'Sign In'}
         </button>
       </form>
     </div>
   </main>
   ```

### Archivo a crear:
| Archivo | Contenido |
|---------|-----------|
| `app/users/login/page.js` | Página de login para admin |

---

## Prompt 3 — Admin Layout y Dashboard Index

### Paso A — Crear `app/admin/layout.js`

Layout compartido para todas las rutas `/admin/*`. Provee el AuthProvider y protección de rutas.

```jsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

function AdminGuard({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/users/login');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="cms-loading-screen">
        <div className="blog-loading-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminGuard>
        {children}
      </AdminGuard>
    </AuthProvider>
  );
}
```

### Paso B — Crear `app/admin/page.js`

El dashboard index — la landing del admin con navegación a Portfolio y Blog.

```jsx
'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="cms-dashboard-page">
      <header className="cms-dashboard-header">
        <div>
          <h1 className="cms-dashboard-title">ienyell admin</h1>
          <p className="cms-dashboard-welcome">
            Welcome back{user?.name ? `, ${user.name}` : ''}.
          </p>
        </div>
        <button type="button" className="cms-btn" onClick={logout}>
          Sign Out
        </button>
      </header>

      <nav className="cms-dashboard-nav">
        <Link href="/admin/portfolio" className="cms-dashboard-card">
          <div className="cms-dashboard-card-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h2>Portfolio</h2>
          <p>Manage illustration projects, categories, and case studies.</p>
        </Link>

        <Link href="/admin/blog" className="cms-dashboard-card">
          <div className="cms-dashboard-card-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h2>Blog</h2>
          <p>Write and publish articles, tutorials, and updates.</p>
        </Link>
      </nav>

      <footer className="cms-dashboard-footer">
        <Link href="/" className="cms-back-button">← Back to site</Link>
      </footer>
    </main>
  );
}
```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `app/admin/layout.js` | AuthProvider wrapper + AdminGuard (redirect si no auth) |
| `app/admin/page.js` | Dashboard index con cards de Portfolio y Blog |

---

## Prompt 4 — CSS del Admin Shell (agregar a `styles/globals.css`)

Agrega estos estilos **al final** de `styles/globals.css`:

```css
/* ══════════════════════════════════════════════════
   CMS — Admin Shell, Login & Dashboard
   ══════════════════════════════════════════════════ */

/* ── Loading screen (auth check) ── */
.cms-loading-screen {
  display: grid;
  place-items: center;
  min-height: 100vh;
  gap: 16px;
  color: var(--text-muted);
  font-size: 14px;
}

/* ── Login page ── */
.cms-login-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--surface);
}
.cms-login-card {
  width: min(400px, 100%);
  padding: 40px 32px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.cms-login-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  margin: 0;
  letter-spacing: -0.02em;
}
.cms-login-subtitle {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  margin: 4px 0 28px;
}
.cms-login-form {
  display: grid;
  gap: 16px;
}
.cms-login-label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
.cms-login-error {
  padding: 10px 14px;
  border-radius: 6px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 13px;
  text-align: center;
}
.cms-login-submit {
  margin-top: 8px;
  padding: 12px;
  font-size: 15px;
  justify-content: center;
}

/* ── Dashboard page ── */
.cms-dashboard-page {
  width: min(800px, calc(100% - 48px));
  margin: 0 auto;
  padding: 80px 0;
}
.cms-dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 48px;
}
.cms-dashboard-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.02em;
}
.cms-dashboard-welcome {
  color: var(--text-muted);
  font-size: 15px;
  margin: 6px 0 0;
}
.cms-dashboard-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.cms-dashboard-card {
  display: grid;
  gap: 10px;
  padding: 28px 24px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  text-decoration: none;
  color: var(--ink);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.cms-dashboard-card:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.cms-dashboard-card-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-tint);
  color: var(--accent);
}
.cms-dashboard-card h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 4px 0 0;
}
.cms-dashboard-card p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}
.cms-dashboard-footer {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

/* ── Dashboard responsive ── */
@media (max-width: 767px) {
  .cms-dashboard-page {
    width: min(100% - 32px, 600px);
    padding-top: 48px;
  }
  .cms-dashboard-header {
    flex-direction: column;
    margin-bottom: 32px;
  }
  .cms-dashboard-nav {
    grid-template-columns: 1fr;
  }
  .cms-login-card {
    padding: 32px 24px;
  }
}
```

### Archivos a crear/modificar:
| Archivo | Contenido |
|---------|-----------|
| `styles/globals.css` | **Agregar al final** — estilos de login, dashboard, loading screen |

---

## Resumen de TODOS los archivos:

| # | Prompt | Archivo | Acción |
|---|--------|---------|--------|
| 1 | P1 | `context/AuthContext.js` | **Crear** |
| 2 | P2 | `app/users/login/page.js` | **Crear** |
| 3 | P3 | `app/admin/layout.js` | **Crear** |
| 4 | P3 | `app/admin/page.js` | **Crear** |
| 5 | P4 | `styles/globals.css` | **Agregar al final** |

**Solo 5 archivos** — ienyell es mucho más simple que Util (2 secciones admin vs 30+, sin Google OAuth, sin notificaciones, sin sidebar colapsable).

**No tocar el backend** — ya tiene todo: `/api/auth/login`, `/api/auth/check`, `/api/auth/me`, `/api/auth/logout`.

**Flujo completo después de ejecutar estos prompts:**
1. Abrir `http://localhost:3000/admin` → redirige a `/users/login`
2. Login con email/password → cookie de sesión → redirige a `/admin`
3. Dashboard muestra 2 cards: Portfolio y Blog
4. Click en Portfolio → `/admin/portfolio` (lista de proyectos)
5. Click en Blog → `/admin/blog` (lista de posts)
6. Sign Out → limpia sesión → redirige a login

**Orden de ejecución recomendado**: Ejecutar ESTOS prompts PRIMERO (admin shell), luego los del portfolio CMS y blog CMS. Pero como ya tienes los CMS creados, solo ejecuta estos 4 prompts y todo debería conectarse automáticamente.
