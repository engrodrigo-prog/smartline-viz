import { MediaUploader } from '../../components/upload/MediaUploader'
import { MapLibreUnified } from '../../components/MapLibreUnified'

export default function UploadMidiaPage() {
  return (
    <div className="grid md:grid-cols-2 gap-4 p-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload de Fotos/Vídeos + SRT</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Fotos com EXIF e vídeos com SRT serão georreferenciados automaticamente e exibidos no mapa.
        </p>
        <MediaUploader />
        <div className="mt-4 text-xs text-muted-foreground">
          Dica: arquivos térmicos (ex.: FLIR, *.tiff) serão enviados para <b>Emendas → Inspeção Termográfica</b>.
        </div>
      </div>
      <div className="h-[70vh] border border-border rounded overflow-hidden">
        <MapLibreUnified showInfrastructure initialZoom={5} />
      </div>
    </div>
  )
}
