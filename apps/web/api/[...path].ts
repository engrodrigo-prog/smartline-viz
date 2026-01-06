import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from './_serverless_app.js'

export const config = {
  runtime: 'nodejs',
}

// Vercel already mounts this handler at /api/*; keep routes rooted at /.
const root = new Hono().route('/', app)

export default handle(root)
