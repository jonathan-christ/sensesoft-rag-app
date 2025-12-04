import { NextResponse } from "next/server";

/**
 * Standard error response shape for API routes.
 */
interface ErrorResponseBody {
  error: string;
  details?: string;
}

/**
 * Return a 401 Unauthorized response.
 */
export function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message } satisfies ErrorResponseBody, {
    status: 401,
  });
}

/**
 * Return a 400 Bad Request response.
 */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message } satisfies ErrorResponseBody, {
    status: 400,
  });
}

/**
 * Return a 404 Not Found response.
 */
export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message } satisfies ErrorResponseBody, {
    status: 404,
  });
}

/**
 * Return a 500 Internal Server Error response.
 * Logs the error to the console with route context for debugging.
 */
export function internalError(
  route: string,
  error: unknown,
  userMessage = "Internal Server Error",
): NextResponse {
  console.error(`Error in ${route}:`, error);
  return NextResponse.json({ error: userMessage } satisfies ErrorResponseBody, {
    status: 500,
  });
}
