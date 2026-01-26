#!/usr/bin/env node
import { spawn } from 'node:child_process'

import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DOMAIN = process.env.DEPLOY_DOMAIN || 'smartline-gpcad.enerlytics.pro'
const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url))
const WEB_DIR = path.join(ROOT_DIR, 'apps/web')

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (err += d.toString()))
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `Exit ${code}`))
      resolve(out)
    })
  })
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function verifyUrl(url, { attempts = 10 } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'smartline-viz-deploy' } })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` → ${text.slice(0, 200)}` : ''}`)
      }
      return
    } catch (err) {
      lastErr = err
      if (attempt < attempts) await sleep(300 * attempt)
    }
  }
  throw lastErr
}

async function main() {
  console.log(`[deploy] Building web…`)
  // Try pnpm, then corepack pnpm, then npm run build
  try {
    await run('pnpm', ['-C', WEB_DIR, 'build'], { cwd: ROOT_DIR })
  } catch (e1) {
    try {
      await run('corepack', ['pnpm', 'build'], { cwd: WEB_DIR })
    } catch (e2) {
      await run('npm', ['run', 'build'], { cwd: WEB_DIR })
    }
  }

  console.log(`[deploy] Deploying to Vercel…`)
  // Deploy from repo root so it uses the intended Vercel project (smartline-viz) with rootDirectory=apps/web,
  // keeping the production custom domain (smartline-gpcad.enerlytics.pro) in sync.
  const output = await run('npx', ['vercel', '--prod', '--yes'], { cwd: ROOT_DIR })
  const match = output.match(/https:\/\/[^\s]*vercel\.app[^\s]*/)
  if (!match) {
    console.log(output)
    throw new Error('Could not parse deployment URL from Vercel output')
  }
  const url = match[0]
  console.log(`[deploy] Deployed: ${url}`)

  console.log(`[deploy] Assigning alias ${DOMAIN}…`)
  const aliasOut = await run('npx', ['vercel', 'alias', 'set', url, DOMAIN], { cwd: ROOT_DIR })
  console.log(aliasOut)

  console.log(`[deploy] Verifying alias…`)
  await verifyUrl(`https://${DOMAIN}/api/health`)
  await verifyUrl(`https://${DOMAIN}/api/linhas`)
  console.log(`[deploy] Done.`)
}

main().catch((err) => {
  console.error('[deploy] Failed:', err.message)
  process.exit(1)
})
