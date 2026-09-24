import { NextResponse } from "next/server";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "VALIDATION_INVALID_PHONE"
  | "VALIDATION_INVALID_FIELD"
  | "AUTH_REQUIRED"
  | "AUTH_INVALID_OTP"
  | "AUTH_EXPIRED_OTP"
  | "ACCESS_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "RATE_LIMITED"
  | "PAYMENT_FAILED"
  | "PAYMENT_DUPLICATE"
  | "PAYMENT_INVALID_SIGNATURE"
  | "CREDIT_INSUFFICIENT"
  | "IMAGE_INVALID"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_CORRUPT"
  | "IMAGE_LIMIT"
  | "DRAFT_INVALID"
  | "DRAFT_LOCKED"
  | "WEBSITE_NOT_PUBLISHED"
  | "STATE_INVALID"
  | "STORAGE_ERROR"
  | "DATABASE_ERROR"
  | "IDEMPOTENCY_REPLAY"
  | "INTERNAL_ERROR";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorPayload {
  code: ErrorCode | string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

export interface ApiError {
  success: false;
  error: ApiErrorPayload;
}

export function ok<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data } as ApiSuccess<T>, { status });
}

export function fail(
  code: ErrorCode,
  message: string,
  opts: { status?: number; fieldErrors?: Record<string, string> } = {}
) {
  const status = opts.status ?? errorCodeToStatus(code);
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        fieldErrors: opts.fieldErrors,
      },
    } as ApiError,
    { status }
  );
}

export function errorCodeToStatus(code: ErrorCode | string): number {
  switch (code) {
    case "AUTH_REQUIRED":
    case "AUTH_INVALID_OTP":
    case "AUTH_EXPIRED_OTP":
      return 401;
    case "ACCESS_DENIED":
      return 403;
    case "RESOURCE_NOT_FOUND":
    case "WEBSITE_NOT_PUBLISHED":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "VALIDATION_ERROR":
    case "VALIDATION_INVALID_PHONE":
    case "VALIDATION_INVALID_FIELD":
    case "IMAGE_INVALID":
    case "IMAGE_TOO_LARGE":
    case "IMAGE_CORRUPT":
    case "IMAGE_LIMIT":
    case "DRAFT_INVALID":
    case "STATE_INVALID":
    case "IDEMPOTENCY_REPLAY":
      return 400;
    case "CREDIT_INSUFFICIENT":
      return 402;
    case "PAYMENT_FAILED":
    case "PAYMENT_DUPLICATE":
    case "PAYMENT_INVALID_SIGNATURE":
    case "DRAFT_LOCKED":
      return 409;
    case "STORAGE_ERROR":
    case "DATABASE_ERROR":
    case "INTERNAL_ERROR":
      return 500;
    default:
      return 400;
  }
}

/** Wrap a handler with consistent error handling + request id. */
export function withErrorHandling<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<NextResponse>
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code && typeof err.code === "string") {
        return fail(err.code as ErrorCode, err.message ?? "Something went wrong.");
      }
      console.error("[LoveStory] unhandled error", e);
      return fail("INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
    }
  };
}
