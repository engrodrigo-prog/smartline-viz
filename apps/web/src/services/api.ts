export interface ApiErrorCause extends Error {
  status: number;
  body?: unknown;
}

export class ApiError extends Error implements ApiErrorCause {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

type RequestOptions = RequestInit & { parseJson?: boolean };

const request = async <T = unknown>(path: string, options: RequestOptions = {}) => {
  const { parseJson = true, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    ...rest
  });

  if (!response.ok) {
    let body: unknown = undefined;
    try {
      body = await response.json();
    } catch (error) {
      body = await response.text().catch(() => undefined);
    }
    throw new ApiError(response.statusText || "Request failed", response.status, body);
  }

  if (!parseJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    }),
  delete: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined
    })
};

export { API_BASE_URL };
