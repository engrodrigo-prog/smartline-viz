import { useEffect, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { MediaUploader } from '../../components/upload/MediaUploader'
import { MapLibreUnified } from '../../components/MapLibreUnified'
import { FramesPreview } from '@/components/upload/FramesPreview'
import { useSelectionContext } from '@/context/SelectionContext'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export default function UploadMidiaPage() {
  const [frames, setFrames] = useState<FeatureCollection | null>(null)
  const [mediaId, setMediaId] = useState<string | null>(null)
  const { linhas, linhaSelecionadaId, cenarios, cenarioSelecionadoId } = useSelectionContext()
  const [linhaUploadId, setLinhaUploadId] = useState<string | undefined>(linhaSelecionadaId)
  const [cenarioUploadId, setCenarioUploadId] = useState<string | undefined>(cenarioSelecionadoId)
  const [tipoInspecao, setTipoInspecao] = useState('ELETROMEC_FINA')
  const [temaPrincipal, setTemaPrincipal] = useState('Inspeção de Ativos')

  useEffect(() => {
    setLinhaUploadId(linhaSelecionadaId)
  }, [linhaSelecionadaId])

  useEffect(() => {
    setCenarioUploadId(cenarioSelecionadoId)
  }, [cenarioSelecionadoId])

  return (
    <div className="grid md:grid-cols-2 gap-4 p-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload de Fotos/Vídeos + SRT</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Fotos com EXIF e vídeos com SRT serão georreferenciados automaticamente e exibidos no mapa.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Linha</Label>
            <Select value={linhaUploadId ?? ""} onValueChange={(value) => setLinhaUploadId(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a linha" />
              </SelectTrigger>
              <SelectContent>
                {linhas.map((linha) => (
                  <SelectItem key={linha.linhaId} value={linha.linhaId}>
                    {linha.nomeLinha ?? linha.codigoLinha}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Cenário</Label>
            <Select
              value={cenarioUploadId ?? ""}
              onValueChange={(value) => setCenarioUploadId(value)}
              disabled={!cenarios.length}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o cenário" />
              </SelectTrigger>
              <SelectContent>
                {cenarios.map((cenario) => (
                  <SelectItem key={cenario.cenarioId} value={cenario.cenarioId}>
                    {cenario.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Tipo de inspeção</Label>
              <Select value={tipoInspecao} onValueChange={setTipoInspecao}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ELETROMEC_FINA">Eletromecânica fina</SelectItem>
                  <SelectItem value="TERMOGRAFICA">Termográfica</SelectItem>
                  <SelectItem value="EXPRESS_FAIXA">Express faixa</SelectItem>
                  <SelectItem value="EXPRESS_VISUAL">Inspeção visual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Tema principal</Label>
              <Input
                className="mt-1"
                value={temaPrincipal}
                onChange={(e) => setTemaPrincipal(e.target.value)}
                placeholder="Inspeção de Ativos"
              />
            </div>
          </div>
        </div>
        <MediaUploader
          onFrames={(fc) => setFrames(fc)}
          onMediaCreated={(id) => setMediaId(id)}
          metaOverrides={{
            lineId: linhaUploadId,
            cenarioId: cenarioUploadId,
            tipoInspecao,
            temaPrincipal,
          }}
        />
        <div className="mt-4 text-xs text-muted-foreground">
          Dica: arquivos térmicos (ex.: FLIR, *.tiff) serão enviados para <b>Emendas → Inspeção Termográfica</b>.
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-[40vh] md:h-[70vh] border border-border rounded overflow-hidden">
          <MapLibreUnified
            showInfrastructure
            initialZoom={5}
            customPoints={frames ?? undefined}
          />
        </div>
        <FramesPreview frames={frames ?? undefined} mediaId={mediaId ?? undefined} />
      </div>
    </div>
  )
}
