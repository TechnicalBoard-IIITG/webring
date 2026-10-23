export type ProviderFailure = "not-found" | "unavailable";

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ProviderFailure };
