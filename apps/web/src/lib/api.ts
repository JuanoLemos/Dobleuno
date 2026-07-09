/**
 * HTTP client minimalista con credentials (cookies) para sessions.
 * Lanza ApiError con status + body parseado.
 */
import { env } from './env.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, query, headers, ...rest } = options;

  // Build URL with query
  const url = new URL(`${env.VITE_API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const response = await fetch(url.toString(), {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorBody = data as { error?: string; message?: string } | string;
    const message = typeof errorBody === 'string'
      ? errorBody
      : errorBody?.error ?? errorBody?.message ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, data, message);
  }

  return data as T;
}
