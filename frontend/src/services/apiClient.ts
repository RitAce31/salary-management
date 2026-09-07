export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue>;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
}

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE_URL = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

function formatErrorMessage(status: number, statusText: string, data?: unknown): string {
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (typeof data === 'object' && data !== null) {
    const dict = data as Record<string, unknown>;

    if (typeof dict.detail === 'string' && dict.detail.trim()) {
      return dict.detail.trim();
    }

    if (Array.isArray(dict.detail) && dict.detail.length > 0) {
      const messages = dict.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const errObj = item as { loc?: (string | number)[]; msg?: string };
            const field =
              Array.isArray(errObj.loc) && errObj.loc.length > 1
                ? `${errObj.loc.slice(1).join('.')}: `
                : '';
            return `${field}${errObj.msg || 'Invalid input'}`;
          }
          return null;
        })
        .filter((msg): msg is string => Boolean(msg && msg.trim()));

      if (messages.length > 0) {
        return messages.join(', ');
      }
    }

    if (typeof dict.message === 'string' && dict.message.trim()) {
      return dict.message.trim();
    }

    if (typeof dict.error === 'string' && dict.error.trim()) {
      return dict.error.trim();
    }
  }

  return `HTTP Error ${status}: ${statusText || 'Request failed'}`;
}

export function buildUrl(path: string, params?: QueryParams): string {
  const isAbsolute = /^https?:\/\//i.test(path);
  const normalizedPath = isAbsolute
    ? path
    : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  if (!params) {
    return normalizedPath;
  }

  const [basePart, existingQuery] = normalizedPath.split('?');
  const searchParams = new URLSearchParams(existingQuery || '');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePart}?${queryString}` : basePart;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, headers: initHeaders, signal, ...rest } = options;
  const url = buildUrl(path, params);

  const headers = new Headers(initHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let requestBody: BodyInit | null = null;
  if (body !== undefined && body !== null) {
    if (
      typeof body === 'object' &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams)
    ) {
      requestBody = JSON.stringify(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } else if (typeof body === 'string') {
      requestBody = body;
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } else {
      requestBody = body as BodyInit;
    }
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers,
      signal,
      body: requestBody,
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : text;
      } catch {
        errorData = undefined;
      }

      const message = formatErrorMessage(response.status, response.statusText, errorData);
      throw new ApiError(message, response.status, errorData);
    }

    if (response.status === 204 || response.status === 205) {
      return null as T;
    }

    const text = await response.text();
    if (!text.trim()) {
      return null as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network connection error',
      0
    );
  }
}

export const apiClient = {
  get: <T>(
    path: string,
    params?: QueryParams,
    options?: Omit<RequestOptions, 'method' | 'params'>
  ): Promise<T> => {
    return request<T>(path, { ...options, method: 'GET', params });
  },

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> => {
    return request<T>(path, { ...options, method: 'POST', body });
  },

  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> => {
    return request<T>(path, { ...options, method: 'PUT', body });
  },

  delete: <T = void>(
    path: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<T> => {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
