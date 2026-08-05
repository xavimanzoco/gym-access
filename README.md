# Gym Access

Sistema de control de acceso para gimnasio. Gestiona socios, planes y pagos, y
expone un endpoint que el controlador del **molinete** consulta para decidir si
habilita el paso según el DNI.

> Pensado para el molinete **Tango (Tango Access) Doble Acceso**, que es una
> traba mecánica con **solenoide de 12V 2A**. El molinete no tiene lógica
> propia: este sistema es el cerebro que decide cuándo abrir.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Drizzle ORM** + **SQLite** (`better-sqlite3`)
- **shadcn/ui** + Tailwind, React Hook Form + Zod, TanStack Table
- Capas: API/Server Actions → Services (lógica) → Repositories (datos)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar valores (ver abajo)
npm run db:migrate           # crea la base SQLite
npm run db:seed              # datos de ejemplo (opcional)
npm run dev                  # http://localhost:3000
```

Panel admin: `/admin` (login en `/login`).

### Variables de entorno (`.env.local`)

| Variable | Para qué |
|---|---|
| `DATABASE_PATH` | Ruta del archivo SQLite (default `gym-access.db`) |
| `DEVICE_TOKEN` | Token que el molinete envía en `x-device-token` |
| `ADMIN_SESSION_SECRET` | Valor de la cookie de sesión del panel |
| `ADMIN_PASSWORD` | Contraseña de ingreso al panel (default dev: `admin1234`) |

## Reglas de acceso

Cuando llega un DNI, `accesoService.validarPorDni` evalúa **en orden**:

1. El DNI corresponde a un socio.
2. El socio está en estado `activo`.
3. Tiene una cuota **al día** (un pago cuyo vencimiento es hoy o futuro).
4. El día y horario actuales están habilitados por su plan.

Cada intento (permitido o denegado) queda registrado en la tabla `accesos`.

## Integración con el molinete

El controlador del molinete hace un `POST` por cada paso:

```
POST /api/v1/acceso/validar
Headers: x-device-token: <DEVICE_TOKEN>
Body:    { "dni": "30111222", "direccion": "entrada" }

Respuesta:
{ "abrir": true, "motivo": "Acceso permitido", "socio": { ... } }
```

Si `abrir` es `true`, el controlador energiza el relé que activa el solenoide
12V durante ~1-2s para liberar el brazo.

> **Pendiente de definir:** este gym ya tenía el molinete andando con otro
> software (Access Gym / Deportnet / Control Gym / etc.). Hay que averiguar
> **con cuál funcionaba y cómo se conectaba** (relé directo, salida del lector
> de teclado, TCP/IP) para conectar este endpoint a ese controlador. Si el
> controlador no puede hacer un POST HTTP, se intercala un microcontrolador
> (ESP32) que lee el teclado/lector, consulta este endpoint y dispara el relé.

## Estructura

```
src/
├── app/
│   ├── (protected)/admin/    # Dashboard, socios, planes, pagos
│   ├── api/v1/acceso/validar # Endpoint del molinete
│   └── login/
├── components/
│   ├── ui/                    # shadcn + DataTable
│   └── admin/                 # Componentes por feature
├── lib/
│   ├── db/                    # Schema Drizzle + cliente + seed
│   ├── repositories/          # Acceso a datos
│   ├── services/              # Lógica de negocio
│   ├── actions/               # Server Actions (mutaciones del panel)
│   ├── validation/            # Schemas Zod
│   ├── security/              # Auth del dispositivo
│   └── auth/                  # Sesión del panel
└── proxy.ts                   # Protege /admin (Next 16: reemplaza middleware)
```

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Entorno de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:generate` | Genera migraciones desde el schema |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:seed` | Carga datos de ejemplo |
| `npm run db:studio` | Explorador visual de la base |

## Seguridad — antes de producción

- Cambiar `DEVICE_TOKEN`, `ADMIN_SESSION_SECRET` y `ADMIN_PASSWORD` por valores
  largos y secretos.
- La sesión del panel usa una cookie con un secreto fijo (suficiente para una
  red local). Para multiusuario, migrar a la tabla `usuarios_admin` con hash de
  contraseña por usuario.
- Servir por HTTPS si el panel queda expuesto fuera de la LAN.
