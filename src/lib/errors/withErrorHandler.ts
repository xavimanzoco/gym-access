import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiError } from "@/lib/errors/ApiError";

type RouteHandler<TCtx> = (
  request: Request,
  context: TCtx
) => Promise<Response> | Response;

/**
 * Envuelve un route handler y traduce errores conocidos a respuestas JSON
 * consistentes. Mantiene los handlers enfocados solo en el happy-path.
 */
export function withErrorHandler<TCtx>(handler: RouteHandler<TCtx>) {
  return async (request: Request, context: TCtx): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Datos inválidos",
            errorCode: "VALIDATION_ERROR",
            issues: error.issues,
          },
          { status: 400 }
        );
      }

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, errorCode: error.errorCode },
          { status: error.statusCode }
        );
      }

      console.error("[API] Error no controlado:", error);
      return NextResponse.json(
        { error: "Error interno del servidor", errorCode: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}
