export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "No encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Datos inválidos") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "No autorizado") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflicto") {
    super(message, 409, "CONFLICT");
  }
}
