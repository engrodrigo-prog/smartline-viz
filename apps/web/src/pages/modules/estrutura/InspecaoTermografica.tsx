export default function InspecaoTermografica() {
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-semibold">Inspeção Termográfica</h2>
      <p className="text-sm text-muted-foreground">
        Após processar, use “Ver GeoJSON” no painel de upload e filtre pontos com <code>thermal=true</code>.
        Em próxima etapa ligaremos a camada do mapa mostrando apenas os pontos térmicos diretamente neste módulo.
      </p>
    </div>
  )
}
