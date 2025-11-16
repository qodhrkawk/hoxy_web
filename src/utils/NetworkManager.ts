/* NetworkManager: 도메인 기반 간단 네트워크 클라이언트 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: HttpMethod;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends Error {
  public readonly status: number;
  public readonly responseBody?: string;
  constructor(status: number, message: string, responseBody?: string) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

function buildQuery(params?: RequestOptions['params']: string) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export class NetworkManager {
  private baseURL: string;
  private defaultTimeoutMs = 30000;

  constructor(baseURL?: string) {
    const envBase =
      (typeof import.meta !== 'undefined' &&
        (import.meta as any).env &&
        (import.meta as any).env.VITE_API_BASE_URL) ||
      undefined;
    this.baseURL = baseURL ?? envBase ?? 'https://hoxy-server.onrender.com';
  }

  public setBaseURL(nextBaseURL: string): void {
    this.baseURL = nextBaseURL.replace(/\/+$/, '');
  }

  public getBaseURL(): string {
    return this.baseURL;
  }

  private createAuthHeaders(token?: string): Record<string, string> {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private resolveURL(endpoint: string, params?: RequestOptions['params']): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseURL}${path}${buildQuery(params)}`;
  }

  public async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      params,
      headers,
      body,
      timeoutMs = this.defaultTimeoutMs,
      signal,
    } = options;

    const url = this.resolveURL(endpoint, method === 'GET' ? params : undefined);

    const finalHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const composedSignal = signal
      ? new AbortController()
      : null;

    if (composedSignal) {
      signal!.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const responseText = await response.text().catch(() => undefined);
      const contentType = response.headers.get('content-type') || '';
      const maybeJson =
        responseText && contentType.includes('application/json')
          ? safeJsonParse(responseText)
          : responseText;

      if (!response.ok) {
        const message =
          typeof maybeJson === 'object' && maybeJson !== null && 'message' in (maybeJson as any)
            ? String((maybeJson as any).message)
            : `서버 오류 (${response.status})`;
        throw new ServerError(response.status, message, responseText);
      }

      return (maybeJson as unknown) as T;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new NetworkError('요청 시간이 초과되었습니다.');
      }
      if (err instanceof ServerError) {
        throw err;
      }
      throw new NetworkError(err?.message || '네트워크 오류가 발생했습니다.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public get<T = unknown>(
    endpoint: string,
    params?: RequestOptions['params'],
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params, headers });
  }

  public post<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  public put<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  public patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  public delete<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', body, headers });
  }

  public bearer(token: string): Record<string, string> {
    return this.createAuthHeaders(token);
  }
}

function safeJsonParse(text?: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const networkManager = new NetworkManager();


