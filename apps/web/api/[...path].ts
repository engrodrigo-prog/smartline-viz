import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from './_serverless_app.js'

export const config = {
  runtime: 'nodejs',
}

// Important: Vercel will call this function under /api/*, so mount the app at /api here.
// This makes /api/health resolve correctly to app.get('/health').
const root = new Hono().route('/api', app)

export default handle(root)
