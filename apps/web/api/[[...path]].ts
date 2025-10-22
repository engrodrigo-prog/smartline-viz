import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from './_serverless_app'

export const config = {
  runtime: 'nodejs18.x',
}

// Mount the serverless subset of the API under /api so the frontend can use VITE_API_BASE_URL=/api
const root = new Hono().route('/api', app)

export default handle(root)
