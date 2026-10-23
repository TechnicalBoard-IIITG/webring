export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Request failed with status ${status}`);
    this.name = "HttpError";
  }
}

export interface FetchOptions extends Omit<RequestInit, "signal"> {
  timeoutMs?: number;
}

async function request(
  url: string,
  options: FetchOptions,
  accept: string,
): Promise<Response> {
  const { timeoutMs = 10_000, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", accept);
  }

  if (!requestHeaders.has("User-Agent")) {
    requestHeaders.set(
      "User-Agent",
      "iiitg-index/1.0 (+https://iiitg-index.vercel.app)",
    );
  }

  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HttpError(response.status, body);
  }

  return response;
}

export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await request(url, options, "application/json");

  return (await response.json()) as T;
}

export async function fetchText(
  url: string,
  options: FetchOptions = {},
): Promise<string> {
  const response = await request(
    url,
    options,
    "text/html,application/xhtml+xml",
  );

  return response.text();
}
