export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.message ?? `HTTP ${res.status}`);
    (err as any).detail = data;
    throw err;
  }

  return (data ?? {}) as T;
}

