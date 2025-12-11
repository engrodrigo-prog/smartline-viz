#!/usr/bin/env node
import { spawn } from 'node:child_process'

import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DOMAIN = process.env.DEPLOY_DOMAIN || 'smartline-gpcad.vercel.app'
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
  const output = await run('npx', ['vercel', '--prod', '--yes', '--cwd', ROOT_DIR], { cwd: ROOT_DIR })
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
  console.log(`[deploy] Done.`)
}

main().catch((err) => {
  console.error('[deploy] Failed:', err.message)
  process.exit(1)
})
