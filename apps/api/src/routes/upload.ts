import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { nanoid } from 'nanoid'
import { env } from '../env.js'
import { presignPut, putObjectLocal, storageKey } from '../lib/storage.js'
import { enqueue, type MediaJob } from '../lib/queue.js'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

const r = new Hono()
r.use('*', cors({ origin: (o)=>!o || env.ALLOWED_ORIGINS.includes(o) }))

r.post('/init', async (c) => {
  const body = await c.req.json().catch(() => null) as {
    items: { filename: string; contentType: string; size?: number }[]
    meta?: Record<string, unknown>
    options?: { frameIntervalSec?: number }
  } | null
  if (!body || !Array.isArray(body.items)) return c.json({ error: 'invalid payload' }, 400)

  const sessionId = nanoid()
  const uploads = await Promise.all(body.items.map(async (it) => {
    const presigned = await presignPut(sessionId, it.filename, it.contentType)
    return {
      filename: it.filename,
      contentType: it.contentType,
      size: it.size,
      strategy: presigned ? 's3' : 'local',
      url: presigned?.url ?? `/upload/file?session=${sessionId}&filename=${encodeURIComponent(it.filename)}`,
      key: presigned?.key ?? storageKey(sessionId, it.filename),
    }
  }))

  return c.json({ sessionId, uploads })
})

r.post('/file', async (c) => {
  const u = new URL(c.req.url)
  const sessionId = u.searchParams.get('session')
  const filename = u.searchParams.get('filename')
  if (!sessionId || !filename) return c.json({ error: 'missing query' }, 400)
  const key = storageKey(sessionId, filename)
  const body = await c.req.arrayBuffer()
  const stream = Readable.from(Buffer.from(body))
  await putObjectLocal(key, stream)
  return c.json({ ok: true, key })
})

r.post('/commit', async (c) => {
  const body = await c.req.json().catch(() => null) as {
    sessionId: string
    items: { filename: string; contentType: string; size?: number }[]
    meta?: Record<string, unknown>
    options?: { frameIntervalSec?: number }
  } | null

  if (!body?.sessionId || !Array.isArray(body.items)) return c.json({ error: 'invalid payload' }, 400)

  const meta = { ...(body.meta ?? {}) }
  const hasThermal = body.items.some(i =>
    /therm|thermal|flir|xt2|ir/i.test(i.filename) || /tiff?$/i.test(extname(i.filename))
  )
  if (hasThermal) meta['targetModule'] = 'emendas/inspecao-termografica'

  const job: MediaJob = {
    id: nanoid(),
    sessionId: body.sessionId,
    items: body.items,
    meta,
    options: { frameIntervalSec: Math.max(1, Number(body.options?.frameIntervalSec ?? 1)) },
    createdAt: new Date().toISOString()
  }

  await enqueue(job)
  return c.json({ ok: true, jobId: job.id })
})

export default r
