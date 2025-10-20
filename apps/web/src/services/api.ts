import { ENV } from '../config/env'

interface RequestOptions extends RequestInit {
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 10000

async function requestJSON<T = unknown>(path: string, init: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT)
  const base = ENV.API_BASE_URL?.replace(/\/+$/, '') || ''
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`

  try {
    const headers = new Headers(init.headers)
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText)
      throw new Error(`${response.status} ${response.statusText} → ${err}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export const getJSON = <T = unknown>(path: string, init?: RequestOptions) =>
  requestJSON<T>(path, { ...(init || {}), method: init?.method ?? 'GET' })

export const postJSON = <T = unknown>(path: string, body?: unknown, init?: RequestOptions) =>
  requestJSON<T>(path, {
    ...(init || {}),
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

export const putJSON = <T = unknown>(path: string, body?: unknown, init?: RequestOptions) =>
  requestJSON<T>(path, {
    ...(init || {}),
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

export const deleteJSON = <T = unknown>(path: string, body?: unknown, init?: RequestOptions) =>
  requestJSON<T>(path, {
    ...(init || {}),
    method: 'DELETE',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
