import { useRef, useState, useEffect } from 'react'
import type { FeatureCollection } from 'geojson'
import { uploadMedia, fetchMediaFrames } from '@/services/media'

type MediaUploaderProps = {
  onJobDone?: (jobId: string) => void;
  onFrames?: (fc: FeatureCollection) => void;
  onMediaCreated?: (mediaId: string) => void;
  metaOverrides?: {
    temaPrincipal?: string;
    lineId?: string;
    cenarioId?: string;
    tipoInspecao?: string;
  };
};

export function MediaUploader({ onJobDone, onFrames, onMediaCreated, metaOverrides }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [intervalo, setIntervalo] = useState(1)
  const [jobId, setJobId] = useState<string | undefined>()
  const [mediaId, setMediaId] = useState<string | undefined>()
  const [status, setStatus] = useState<string>('')
  const [frames, setFrames] = useState<FeatureCollection | null>(null)

  function pick() {
    inputRef.current?.click()
  }

  function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles([...(e.target.files || [])])
  }

  async function start() {
    if (!files.length) return
    setStatus('Enviando arquivos...')
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    // Campo obrigatório pelo backend
    form.append('temaPrincipal', metaOverrides?.temaPrincipal ?? 'Inspeção de Ativos')
    form.append('frame_interval_s', String(Math.max(1, Number(intervalo) || 1)))
    if (metaOverrides?.lineId) {
      form.append('lineId', metaOverrides.lineId)
    }
    if (metaOverrides?.cenarioId) {
      form.append('cenarioId', metaOverrides.cenarioId)
    }
    if (metaOverrides?.tipoInspecao) {
      form.append('tipo_inspecao', metaOverrides.tipoInspecao)
    }
    try {
      const res = await uploadMedia(form)
      setJobId(res.jobId)
      setMediaId(res.id)
      onJobDone?.(res.jobId)
      onMediaCreated?.(res.id)
      setStatus('Processando… gerando frames no worker.')
      setFiles([])
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    } catch (err: any) {
      setStatus(err?.message || 'Falha no upload de mídia')
    }
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
      {mediaId && (
        <FramesWatcher
          mediaId={mediaId}
          onFrames={(fc) => {
            setFrames(fc)
            onFrames?.(fc)
          }}
          onReady={() => setStatus('Processamento concluído. Frames disponíveis abaixo.')}
        />
      )}
      {frames && (
        <div className="text-xs text-muted-foreground">Frames recebidos: {frames.features?.length ?? 0}</div>
      )}
    </div>
  )
}

function FramesWatcher({ mediaId, onFrames, onReady }: { mediaId: string; onFrames: (fc: FeatureCollection) => void; onReady?: () => void }) {
  useEffect(() => {
    let stop = false
    let resolved = false
    const poll = async () => {
      try {
        const data = await fetchMediaFrames(mediaId)
        if (!stop) {
          onFrames(data)
          if (!resolved) {
            onReady?.()
            resolved = true
          }
        }
        return
      } catch {/* not ready */}
      if (!stop) setTimeout(poll, 1500)
    }
    poll()
    return () => {
      stop = true
    }
  }, [mediaId, onFrames, onReady])
  return null
}
