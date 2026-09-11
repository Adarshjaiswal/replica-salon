import { z } from "zod";

export const requestIdSchema = z.string().min(8).max(128);

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  details: z.array(z.unknown()).default([]),
  requestId: requestIdSchema,
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50, 100].includes(value), {
      message: "pageSize must be one of 10, 25, 50, 100",
    })
    .default(25),
  search: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(80).optional(),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface SuccessEnvelope<
  TData,
  TMeta extends Record<string, unknown> = Record<string, never>,
> {
  data: TData;
  meta: TMeta & {
    requestId: string;
  };
}

export interface ErrorEnvelope {
  error: ApiError;
}

export function successEnvelope<
  TData,
  TMeta extends Record<string, unknown> = Record<string, never>,
>(data: TData, requestId: string, meta?: TMeta): SuccessEnvelope<TData, TMeta> {
  return {
    data,
    meta: {
      ...(meta ?? ({} as TMeta)),
      requestId,
    },
  };
}

export function errorEnvelope(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details: unknown[] = [],
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      details,
      requestId,
    },
  };
}
