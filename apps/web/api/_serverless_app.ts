import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Reuse existing route modules from the API package
import { firmsRoutes } from '../../api/src/routes/firms'
import weatherRoutes from '../../api/src/routes/weather'
import { env } from '../../api/src/env'

const app = new Hono()

app.use('*',
  cors({
    origin: (origin) => {
      const fallback = env.ALLOWED_ORIGINS[0] ?? 'http://localhost:5173'
      if (!origin) return fallback
      const allowed = env.ALLOWED_ORIGINS
      const match = allowed.some((pat) => {
        if (!pat) return false
        if (pat === '*') return true
        if (pat.startsWith('*.')) return origin.endsWith(pat.slice(1))
        return pat === origin
      })
      return match ? origin : fallback
    },
    credentials: true,
    allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowHeaders: ['Content-Type','Authorization'],
    exposeHeaders: ['Content-Type','Content-Disposition'],
    maxAge: 86400,
  })
)

app.use('*', logger())

app.get('/health', (c) => c.json({ status: 'ok', runtime: 'vercel-serverless' }))
app.route('/firms', firmsRoutes)
app.route('/weather', weatherRoutes)

export default app

