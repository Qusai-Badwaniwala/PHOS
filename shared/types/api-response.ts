/**
 * Standard successful API response envelope (SDS Part 15 "STANDARD
 * RESPONSE FORMAT"). Every successful endpoint response follows this
 * shape.
 */
export interface ApiSuccessResponse<TData> {
  readonly success: true;
  readonly data: TData;
  readonly metadata: Readonly<Record<string, unknown>> | null;
  readonly timestamp: string;
}

/**
 * Standard failed API response envelope. Reconciles SDS Part 15
 * ("success, error, code, message, timestamp"), Part 16 ("ERROR DTO":
 * "success, errorCode, message, timestamp, optionalDetails"), and
 * Part 19 ("API ERROR RESPONSES": "success, errorCode, message,
 * timestamp, correlationId") into one consistent shape, following
 * Part 19 as the most detailed and specifically-titled error
 * specification. Internal implementation details (e.g. stack traces)
 * are never included, per Part 19 "Stack traces shall never be exposed
 * outside the backend."
 */
export interface ApiErrorResponse {
  readonly success: false;
  readonly errorCode: string;
  readonly message: string;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;
