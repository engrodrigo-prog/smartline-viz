#!/usr/bin/env node
import { spawn } from 'node:child_process'

const DOMAIN = process.env.DEPLOY_DOMAIN || 'smartline-gpcad.vercel.app'
const CWD = new URL('../apps/web', import.meta.url).pathname

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, ...opts })
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
    await run('pnpm', ['-C', '.', 'build'], { cwd: CWD })
  } catch (e1) {
    try {
      await run('corepack', ['pnpm', 'build'], { cwd: CWD })
    } catch (e2) {
      await run('npm', ['run', 'build'], { cwd: CWD })
    }
  }

  console.log(`[deploy] Deploying to Vercel…`)
  const output = await run('npx', ['vercel', '--prod', '--yes', '--cwd', CWD])
  const match = output.match(/Production:\s+(https:\/\/[^\s]+)/)
  if (!match) {
    console.log(output)
    throw new Error('Could not parse deployment URL from Vercel output')
  }
  const url = match[1]
  console.log(`[deploy] Deployed: ${url}`)

  console.log(`[deploy] Assigning alias ${DOMAIN}…`)
  const aliasOut = await run('npx', ['vercel', 'alias', 'set', url, DOMAIN])
  console.log(aliasOut)
  console.log(`[deploy] Done.`)
}

main().catch((err) => {
  console.error('[deploy] Failed:', err.message)
  process.exit(1)
})
