export const config = { runtime: 'nodejs' }

export default function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'application/json')
  res.status(200).end(JSON.stringify({ status: 'ok', runtime: 'vercel-node', ts: new Date().toISOString() }))
}

