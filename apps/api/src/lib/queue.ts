import { env } from '../env.js'
import Redis from 'ioredis'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const hasRedis = !!env.REDIS_URL
const redis = hasRedis ? new Redis(env.REDIS_URL!) : null

export type MediaJob = {
  id: string
  sessionId: string
  items: { filename: string; contentType: string; size?: number }[]
  meta: Record<string, unknown>
  options: { frameIntervalSec?: number }
  createdAt: string
}

export async function enqueue(job: MediaJob) {
  if (redis) {
    await redis.lpush('media_jobs', JSON.stringify(job))
  } else {
    mkdirSync('workers/media/inbox', { recursive: true })
    writeFileSync(join('workers/media/inbox', `${job.id}.json`), JSON.stringify(job, null, 2))
  }
}

export async function writeStatus(jobId: string, status: any) {
  mkdirSync('workers/media/outbox', { recursive: true })
  writeFileSync(join('workers/media/outbox', `${jobId}.status.json`), JSON.stringify(status, null, 2))
}
