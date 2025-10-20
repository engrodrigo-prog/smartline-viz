import { env } from '../env.js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'

const useS3 = !!(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)

const s3 = useS3 ? new S3Client({
  region: 'auto',
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
}) : null

export function storageKey(sessionId: string, filename: string) {
  return `raw/${sessionId}/${filename}`
}
export function processedKey(sessionId: string, filename: string) {
  return `processed/${sessionId}/${filename}`
}

export async function presignPut(sessionId: string, filename: string, contentType: string) {
  if (!s3) return null
  const Key = storageKey(sessionId, filename)
  const cmd = new PutObjectCommand({ Bucket: env.S3_BUCKET!, Key, ContentType: contentType })
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 })
  return { url, key: Key }
}

export async function putObjectLocal(key: string, stream: Readable) {
  const dst = join(process.cwd(), 'apps/api/.data', key)
  mkdirSync(dirname(dst), { recursive: true })
  const ws = createWriteStream(dst)
  await pipeline(stream, ws)
  return { ok: true, path: dst }
}
