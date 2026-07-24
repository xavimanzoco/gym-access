/*
 * molinete_pico.ino — Controlador del relé del molinete (Raspberry Pi Pico).
 *
 * Corre EN el Pico. Escucha el USB-serie que le manda la PC (la app "Gym
 * Access") y, cuando recibe "ABRIR", libera el molinete unos segundos para que
 * pase la persona; después vuelve a trabar. Responde "OK".
 *
 *     PC (Gym Access) --USB serie--> Pico (este sketch) --GP15--> relé --> molinete
 *
 * LUZ (LED de la plaquita, GP25):
 *   - prende al enchufar
 *   - parpadea lento  = está vivo y esperando
 *   - queda fija      = está abriendo (relé activado)
 *
 * COMPORTAMIENTO DEL MOLINETE (verificado en el gimnasio):
 *   - blanco + rojo  = TRABADO (cruz roja)
 *   - blanco + verde = LIBRE (gira, deja pasar)
 *   - sin corriente  = suelto (por eso lo dejamos trabado por defecto)
 *
 * CABLEADO — se usa el contacto conmutado del relé (1 canal alcanza):
 *   blanco -> COM  (tornillo del medio)
 *   rojo   -> NC   (en reposo el relé une COM-NC => blanco-rojo => TRABADO)
 *   verde  -> NO   (al activar, une COM-NO => blanco-verde => LIBRE)
 *   Si al probar queda al revés, invertí rojo y verde.
 *
 * Relé al Pico:  VCC(+)->pin40(VBUS) · GND(-)->pin33(GND) · IN(S)->pin34(GP28)
 */

// ── Configuración ────────────────────────────────────────────────────────────
const int  RELAY_PIN         = 28;    // GP28 (pin físico 34). Debe coincidir con el cableado.
const int  LED_PIN           = LED_BUILTIN; // GP25, LED de la plaquita
const bool ACTIVE_HIGH       = true;  // true: GP15 en ALTO activa el relé (abre).
                                      // Si al ARRANCAR el molinete queda LIBRE, poné false.
const int  TIEMPO_ABIERTO_MS = 4000;  // cuánto queda libre para que pase la persona
const int  TIEMPO_TEST_MS    = 20000; // comando "TEST": lo mantiene libre para chequear cableado
const int  PARPADEO_MS       = 700;   // ritmo del parpadeo de "estoy vivo"
const char* CMD_ABRIR        = "ABRIR";
const char* CMD_TEST         = "TEST";
// ─────────────────────────────────────────────────────────────────────────────

// Reposo = TRABADO (relé sin energizar, COM-NC = blanco-rojo).
inline void releTrabar() { digitalWrite(RELAY_PIN, ACTIVE_HIGH ? LOW : HIGH); }
// Activo = LIBRE (relé energizado, COM-NO = blanco-verde).
inline void releLiberar() { digitalWrite(RELAY_PIN, ACTIVE_HIGH ? HIGH : LOW); }

unsigned long ultimoParpadeo = 0;
bool ledEncendido = true;

void liberarPor(int ms) {
  digitalWrite(LED_PIN, HIGH);  // LED fijo mientras abre
  releLiberar();
  delay(ms);
  releTrabar();
  ledEncendido = true;          // el parpadeo retoma desde encendido
  ultimoParpadeo = millis();
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  releTrabar();                 // arranca TRABADO
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // prende al enchufar
  Serial.begin(9600);
}

void loop() {
  // Parpadeo lento de "estoy vivo" mientras espera.
  if (millis() - ultimoParpadeo >= (unsigned long)PARPADEO_MS) {
    ledEncendido = !ledEncendido;
    digitalWrite(LED_PIN, ledEncendido ? HIGH : LOW);
    ultimoParpadeo = millis();
  }

  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == CMD_ABRIR) {
    liberarPor(TIEMPO_ABIERTO_MS);
    Serial.println("OK");
  } else if (cmd == CMD_TEST) {
    liberarPor(TIEMPO_TEST_MS);  // libre 20 s para verificar el cableado
    Serial.println("OK");
  } else if (cmd.length() > 0) {
    // DIAGNÓSTICO: parpadeo rápido = "recibí datos por USB" (aunque no sea un comando).
    for (int i = 0; i < 8; i++) {
      digitalWrite(LED_PIN, (i % 2 == 0) ? HIGH : LOW);
      delay(90);
    }
    ledEncendido = true;
    digitalWrite(LED_PIN, HIGH);
    ultimoParpadeo = millis();
    Serial.println("ERR");
  }
}
