/**
 * Classification of OpenAI API failures.
 *
 * A 429 means either "slow down" or "your balance is gone", and the two need opposite
 * responses: one is worth waiting for, the other never resolves on its own. The API
 * distinguishes them in the structured error body, so that detail is carried on the
 * thrown error instead of being flattened into a message string.
 */

export interface OpenAiApiError extends Error {
  status?: number;
  openaiType?: string;
  openaiCode?: string;
}

interface OpenAiErrorBody {
  error?: {
    type?: string;
    code?: string;
    message?: string;
  };
}

/** Builds an error that carries the structured fields the classifiers below rely on. */
export function createOpenAiApiError(
  status: number,
  body: OpenAiErrorBody | null | undefined
): OpenAiApiError {
  const error = new Error(
    `OpenAI API error: ${status} - ${JSON.stringify(body ?? {})}`
  ) as OpenAiApiError;
  error.status = status;
  error.openaiType = body?.error?.type;
  error.openaiCode = body?.error?.code;
  return error;
}

function asApiError(error: unknown): OpenAiApiError {
  return (error ?? {}) as OpenAiApiError;
}

/** An exhausted balance also arrives as 429, but waiting never clears it. */
export function isCreditExhausted(error: unknown): boolean {
  const apiError = asApiError(error);
  return (
    apiError.openaiType === "insufficient_quota" ||
    apiError.openaiCode === "credit_balance_exhausted"
  );
}

export function isRateLimit(error: unknown): boolean {
  const apiError = asApiError(error);
  if (isCreditExhausted(error)) return false;
  return apiError.status === 429 || /rate limit/i.test(apiError.message ?? "");
}

/**
 * A message meant for the person who pressed the button.
 *
 * Rate limits are reported as "try again shortly" rather than retried in place: this
 * runs inside a request with a 60s ceiling, and the backoff a rate limit actually needs
 * is longer than the budget. Failing fast leaves the existing schedule untouched and
 * lets the user retry when they choose.
 */
export function describeOpenAiFailure(error: unknown): string {
  if (isCreditExhausted(error)) {
    return "Az OpenAI fiók kreditje elfogyott, ezért az ütemterv most nem generálható. Töltsd fel az egyenleget az OpenAI billing oldalán.";
  }
  if (isRateLimit(error)) {
    return "Az OpenAI pillanatnyilag korlátozza a kéréseket. Várj egy percet, és próbáld újra.";
  }
  const apiError = asApiError(error);
  if (apiError.status && apiError.status >= 500) {
    return "Az OpenAI szolgáltatás átmenetileg nem elérhető. Próbáld újra kicsit később.";
  }
  return "Az ütemterv generálása nem sikerült. Az eddigi ütemterv változatlan maradt.";
}
