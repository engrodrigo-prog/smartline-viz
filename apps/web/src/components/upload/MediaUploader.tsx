import { useRef, useState, useEffect } from 'react'
import { initUpload, sendFiles, commitUpload } from '../../services/upload'
import { ENV } from '../../config/env'

export function MediaUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [intervalo, setIntervalo] = useState(1)
  const [jobId, setJobId] = useState<string | undefined>()
  const [status, setStatus] = useState<string>('')

  function pick() {
    inputRef.current?.click()
  }

  function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles([...(e.target.files || [])])
  }

  async function start() {
    if (!files.length) return
    setStatus('Preparando...')
    const plan = await initUpload(files)
    setStatus('Enviando arquivos...')
    await sendFiles(plan, files)
    setStatus('Enfileirando processamento...')
    const { jobId } = await commitUpload(plan.sessionId, files, { frameIntervalSec: intervalo })
    setJobId(jobId)
    setStatus('Processando… acompanhe o status abaixo.')
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".jpg,.jpeg,.png,.tif,.tiff,.mp4,.mov,.m4v,.avi,.mkv,.srt"
        onChange={onChoose}
      />
      <div className="flex flex-wrap gap-2 items-center">
        <button className="border border-border rounded px-3 py-1 text-sm" onClick={pick}>
          Escolher arquivos
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={intervalo}
            onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value)))}
            className="border border-border rounded px-2 w-24 h-9"
          />
          <span className="text-sm text-muted-foreground">Intervalo (s) para frames de vídeo</span>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado'}
      </div>
      <button
        disabled={!files.length}
        className="border border-border rounded px-3 py-1 text-sm disabled:opacity-50"
        onClick={start}
      >
        Enviar & Processar
      </button>
      {status && <div className="text-sm text-foreground/80">{status}</div>}
      {jobId && <div className="text-sm">Job: <code>{jobId}</code></div>}
      {jobId && <JobStatus jobId={jobId} />}
    </div>
  )
}

function JobStatus({ jobId }: { jobId: string }) {
  const [state, setState] = useState<string>('queued')
  const [features, setFeatures] = useState<number>(0)

  useEffect(() => {
    let mounted = true

    const tick = async () => {
      const base = ENV.API_BASE_URL.replace(/\/+$/, '')
      const res = await fetch(`${base}/jobs/${jobId}/status`).then((r) => r.json())
      if (!mounted) return
      if (res.state) setState(res.state)
      if (typeof res.features === 'number') setFeatures(res.features)
      if (res.state !== 'done') {
        setTimeout(tick, 1000)
      }
    }

    tick()
    return () => {
      mounted = false
    }
  }, [jobId])

  const base = ENV.API_BASE_URL.replace(/\/+$/, '')
  return (
    <div className="text-sm text-muted-foreground">
      Status: <b>{state}</b>
      {features > 0 && <>
        {' '}• {features} pontos
      </>}
      {state === 'done' && (
        <a
          href={`${base}/jobs/${jobId}/result`}
          className="underline ml-2"
          target="_blank"
          rel="noreferrer"
        >
          Ver GeoJSON
        </a>
      )}
    </div>
  )
}
