import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from './_serverless_app'

export const config = {
  runtime: 'nodejs',
}

const root = new Hono().route('/api', app)
const handler = handle(root)

export default function vercelHandler(req: any, res: any) {
  const rawPath = typeof req?.query?.path === 'string' ? req.query.path : ''
  if (rawPath) {
    const url = new URL(req.url, `http://${req.headers?.host ?? 'localhost'}`)
    const normalized = rawPath.replace(/^\/+/, '')
    url.pathname = `/api/${normalized}`
    req.url = url.pathname + url.search
  }
  return handler(req, res)
}
