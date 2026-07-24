/**
 * Errores de dominio con un código legible. Los servicios los lanzan y la capa
 * de UI (Server Actions) los traduce a mensajes para el usuario.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** El recurso solicitado no existe. */
export class NotFoundError extends AppError {
  constructor(message = "No encontrado") {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/** Violación de una regla de negocio o validación (ej: DNI duplicado). */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION");
    this.name = "ValidationError";
  }
}
