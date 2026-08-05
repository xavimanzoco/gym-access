# Plan de integración del molinete

> Documento de planificación. Generado tras analizar la placa controladora del molinete.
> Estado: **planificado, sin implementar**. Ejecutar cuando se tenga el molinete + la compu de la puerta.

## 1. Diagnóstico (confirmado)

| Item | Resultado |
|---|---|
| Placa | **Raspberry Pi Pico común — SIN WiFi** (serigrafía "Raspberry Pi Pico © 2020", sin módulo RF) |
| Firmware actual | Arduino **Mbed core 4.0.2**, compilado en Windows. Sin red, sin protocolo de texto legible |
| Contenido de la caja | **Pico + módulo relé 5V** (JQC3F-05VDC-C, 10A). Nada más |
| Entrada de teclado | **Ninguna** en la caja (no hay USB-A, ni Wiegand, ni conector matricial) |
| Cómo abre | Pin GPIO → módulo relé → cable de salida al molinete |
| Conexión a la red | **No tiene** (Pico común sin WiFi). Hoy depende del USB |
| Teclado del molinete | Numérico, **probablemente USB** (a confirmar con el molinete delante) |
| Backup firmware original | `hardware/molinete/firmware-original-backup.bin` (2 MB, restaurable con `picotool load`) |

### Qué es realmente la caja
Un **"abridor de puerta por USB"**: recibe una orden por el cable USB y pulsa el relé. No lee ningún
teclado ni tiene red por sí sola.

### Por qué decían "no se puede usar con el teclado"
Es cierto **solo** si se intenta enchufar el teclado USB directo a la Pico (la Pico no es host USB
plug-and-play). El sistema **sí funciona** si el teclado va a una computadora y la compu le ordena
a la Pico que abra. Eso explica los "2 USB": teclado USB + caja Pico, ambos en la compu.

## 2. Arquitectura elegida — Camino A (compu en la puerta)

```
[Teclado num. USB] ──► [COMPUTADORA: pantalla kiosko] ──► [Caja Pico+relé] ──► abre molinete
   socio teclea DNI       valida en /api/v1/acceso/validar      pulso al relé (USB serie)
```

Ventajas: no requiere comprar nada, no requiere WiFi, usa la caja tal cual y reutiliza la API existente.

### Alternativa — Camino B (autónomo, sin compu)
Requiere **Pico W** (drop-in, mismos pines, mover los 3 cables del relé) **+** cablear el teclado a
los pines de la Pico (necesita el molinete delante). Más prolijo a largo plazo, pero requiere hardware
nuevo y que el teclado sea cableado (matricial/Wiegand) o lidiar con USB-host (TinyUSB) si es USB.

## 3. Qué hay que construir (Camino A)

### Pieza 1 — Firmware nuevo para la Pico
- Sketch Arduino (core RP2040). Lógica mínima:
  - Inicializar el pin del relé como salida.
  - Leer del puerto USB serie. Al recibir el comando de abrir (p.ej. línea `ABRIR\n`), pulsar el relé
    ~1 s y volver a reposo.
  - Opcional: responder `OK\n` para confirmar.
- **Confirmar el pin del relé**: hay 3 cables (VCC 5V desde VBUS, GND, y señal a un GPIO). El GPIO de
  señal se confirma con un mini test (pulsar y oír el "clic" del relé). Ver fotos en este directorio.
- Cargar: poner la Pico en BOOTSEL (botón) y arrastrar el `.uf2`, o `arduino-cli upload`.

### Pieza 2 — Pantalla de kiosko en la app Next.js
- Página dedicada (modo kiosko, pantalla completa) con un input **siempre enfocado** que captura el DNI
  que teclea el teclado numérico USB y detecta Enter.
- Al confirmar: llamar a `POST /api/v1/acceso/validar` (ya existe) con `{ dni, direccion: "entrada" }`
  y el header `x-device-token`.
- Si la respuesta es `{ abrir: true }`: enviar el comando de abrir a la Pico por **Web Serial**
  (Chrome/Edge, también en Mac). Si `false`: mostrar el motivo en pantalla.
- Respetar capas del proyecto: lógica de serie en un service/hook, no en el componente de UI.
- Web Serial requiere un gesto del usuario para conectar el puerto la primera vez (botón "Conectar molinete").

## 4. A confirmar cuando se tenga el molinete
1. Foto del teclado por detrás / su conector → confirmar que es **USB** (o detectar matricial/Wiegand).
2. Modelo del teclado numérico (si manda Enter al final, o hay que detectar largo fijo de DNI).
3. Pin exacto del relé en la Pico (test rápido).
4. Tiempo de pulso necesario para que el molinete dé un giro (ajustar el ~1 s).

## 5. Toolchain necesario (cuando se implemente)
- `picotool` (ya instalado vía Homebrew) — para backup/restore/flash.
- `arduino-cli` + core RP2040 (Earle Philhower o Arduino Mbed) — para compilar/cargar el firmware.
- App Next.js del repo corriendo en la compu de la puerta, abierta en Chrome/Edge para Web Serial.

## 6. Notas de seguridad / operación
- El backup del firmware original permite volver atrás: `picotool load hardware/molinete/firmware-original-backup.bin`.
- Para sacar la Pico de BOOTSEL sin flashear: desenchufar y reenchufar el USB (sin tocar el botón).
- `DEVICE_TOKEN` debe estar configurado en el server y en el cliente kiosko (env), nunca hardcodeado.
