import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, request, ApiError, buildUrl } from './apiClient';

describe('apiClient buildUrl', () => {
  it('appends query parameters including booleans, numbers, and strings, ignoring null and undefined', () => {
    const url = buildUrl('/api/employees', {
      page: 1,
      page_size: 25,
      is_active: false,
      search: 'Alice',
      filter: null,
      missing: undefined,
      blank: '',
    });

    expect(url).toContain('/api/employees?');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=25');
    expect(url).toContain('is_active=false');
    expect(url).toContain('search=Alice');
    expect(url).not.toContain('filter');
    expect(url).not.toContain('missing');
    expect(url).not.toContain('blank');
  });

  it('merges new params with existing query parameters in the path', () => {
    const url = buildUrl('/api/data?existing=true', {
      added: 123,
    });
    expect(url).toContain('/api/data?existing=true&added=123');
  });

  it('preserves absolute URLs without prepending base URL', () => {
    const url = buildUrl('https://example.com/external/api', { id: 42 });
    expect(url).toBe('https://example.com/external/api?id=42');
  });
});

describe('apiClient request and methods', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sets Accept header and omits Content-Type when request has no body', async () => {
    let capturedHeaders: Headers | undefined;

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = init?.headers as Headers;
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const result = await apiClient.get<{ success: boolean }>('/api/test');
    expect(result).toEqual({ success: true });
    expect(capturedHeaders?.get('Accept')).toBe('application/json');
    expect(capturedHeaders?.get('Content-Type')).toBeNull();
  });

  it('adds Content-Type application/json when JSON body is provided in POST', async () => {
    let capturedHeaders: Headers | undefined;
    let capturedBody: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = init?.headers as Headers;
      capturedBody = init?.body as string;
      return Promise.resolve(
        new Response(JSON.stringify({ id: 1 }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const result = await apiClient.post<{ id: number }>('/api/create', { name: 'Test' });
    expect(result).toEqual({ id: 1 });
    expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
    expect(capturedBody).toBe(JSON.stringify({ name: 'Test' }));
  });

  it('correctly handles 204 No Content without JSON parsing errors', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    const result = await request<null>('/api/empty', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  it('correctly parses backend FastAPI string detail errors into ApiError', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(JSON.stringify({ detail: 'Employee not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await expect(apiClient.get('/api/missing')).rejects.toThrow(ApiError);
    await expect(apiClient.get('/api/missing')).rejects.toMatchObject({
      status: 404,
      message: 'Employee not found',
    });
  });

  it('correctly parses FastAPI validation errors with field location and message', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            detail: [
              { loc: ['body', 'amount'], msg: 'Input should be greater than 0' },
              { loc: ['body', 'currency'], msg: 'Field required' },
            ],
          }),
          {
            status: 422,
            statusText: 'Unprocessable Entity',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    });

    try {
      await apiClient.post('/api/validate', {});
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.message).toBe(
        'amount: Input should be greater than 0, currency: Field required'
      );
    }
  });

  it('re-throws AbortError on request cancellation', async () => {
    const controller = new AbortController();
    controller.abort();

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      if (init?.signal?.aborted) {
        const abortErr = new DOMException('The user aborted a request.', 'AbortError');
        return Promise.reject(abortErr);
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    await expect(
      apiClient.get('/api/cancel', undefined, { signal: controller.signal })
    ).rejects.toThrow('The user aborted a request.');
  });
});
