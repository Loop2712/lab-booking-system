/** Common API response shapes - use across services for consistency */

export type ApiOk<T = unknown> = { ok: true } & T;
export type ApiError = { ok: false; message?: string; detail?: unknown };

export function assertOk<T extends { ok?: boolean }>(data: T, fallback = "Request failed"): asserts data is T & { ok: true } {
  if (!data?.ok) {
    const err = new Error((data as ApiError)?.message ?? fallback);
    (err as Error & { detail?: unknown }).detail = data;
    throw err;
  }
}
