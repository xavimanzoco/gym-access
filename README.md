# Gym Access

Sistema de **control de acceso y socios** para un gimnasio. Pensado para correr
**100% offline en una sola PC** (Windows) de recepción: no necesita internet ni
servidores en la nube.

## Qué hace

- **Ingreso** (kiosco): el socio ingresa su DNI en el molinete; el sistema valida
  la cuota y, si está al día, ordena abrir el molinete. Registra cada intento.
- **Socios**: alta, búsqueda y baja de socios. El DNI es la credencial.
- **Pagos**: registro de cuotas; actualiza automáticamente el vencimiento del socio.
- **Reportes**: recaudación del día, ingresos, socios activos y cuotas vencidas.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**.
- **SQLite** vía `node:sqlite` (incorporado en Node, sin módulos nativos que
  compilar). La base es un único archivo en disco.
- Arquitectura por capas: `page` → `components` → `services` → `repositories` → DB.

## Correr en desarrollo

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. La base de datos se crea sola en `data/gym.db` la
primera vez (con planes de ejemplo). Se puede cambiar su ubicación con la variable
de entorno `GYM_DB_PATH`.

## Base de datos

- Archivo local en `data/gym.db` (ignorado por git).
- Tablas: `planes`, `socios`, `pagos`, `accesos`. Ver [`src/lib/db/schema.ts`](src/lib/db/schema.ts).
- Backup = copiar el archivo `gym.db`. Restaurar = reemplazarlo.

## Molinete (pendiente de conectar)

El molinete manda el DNI a la PC como **teclado USB** (una sola vía). La orden de
**apertura** viaja por un canal aparte hacia el **relé** ya conectado. Ese punto
está aislado en un solo archivo, listo para completar:

- [`src/lib/services/hardware/molineteController.ts`](src/lib/services/hardware/molineteController.ts)

Hoy usa una implementación **simulada** (loguea la orden). Al conectar el relé,
solo se reemplaza el cuerpo de `abrir()`; el resto del sistema no cambia.

## Empaquetado offline (siguiente paso)

`next.config.ts` usa `output: "standalone"`, que genera un servidor Node mínimo en
`.next/standalone`. El plan es envolver eso en un **instalador `.exe`** (Tauri o
Electron) para que en la PC del gimnasio se instale y se abra como una app normal,
sin terminal y sin internet.
