import { ENV } from '../config/env'
import { getJSON } from './api'

export type UploadPlan = {
  sessionId: string
  uploads: { filename: string; contentType: string; url: string; strategy: 's3' | 'local'; key: string }[]
}

export async function initUpload(files: File[]) {
  const payload = {
    items: files.map((f) => ({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size })),
    meta: {},
    options: { frameIntervalSec: 1 }
  }
  return getJSON<UploadPlan>('/upload/init', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function sendFiles(plan: UploadPlan, files: File[]) {
  const planMap = new Map(plan.uploads.map((u) => [u.filename, u]))
  for (const file of files) {
    const target = planMap.get(file.name)
    if (!target) continue
    if (target.strategy === 's3') {
      await fetch(target.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      })
    } else {
      const base = ENV.API_BASE_URL.replace(/\/+$/, '')
      await fetch(`${base}${target.url}`, { method: 'POST', body: file })
    }
  }
}

export async function commitUpload(
  sessionId: string,
  files: File[],
  opts: { frameIntervalSec: number; meta?: Record<string, unknown> }
) {
  const payload = {
    sessionId,
    items: files.map((f) => ({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size })),
    meta: { ...(opts.meta || {}) },
    options: { frameIntervalSec: opts.frameIntervalSec }
  }
  return getJSON<{ ok: true; jobId: string }>('/upload/commit', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
}
