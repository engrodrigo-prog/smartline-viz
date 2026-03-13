# Supabase + QGIS + PostGIS

## Estado atual encontrado

- O projeto ja usa Supabase no `apps/web`, com `postgis` habilitado em migrations anteriores.
- Havia modelagem vetorial distribuida entre `linhas_transmissao`, `estruturas`, `concessoes_geo`, `eventos_geo` e `geodata_outros`.
- O fluxo de raster estava incompleto:
  - a Edge Function `process-raster` gravava em `rasters`, mas nao existia migration correspondente no repositório;
  - o componente `RasterUpload` nao subia o arquivo para o Storage antes de invocar a function;
  - `useGeodataQuery` era apenas stub e nao abastecia dashboards.

## Oportunidade de integracao com QGIS

- O melhor encaixe com QGIS nao e criar uma segunda stack GIS, e sim usar o proprio PostGIS do Supabase como fonte canonica.
- QGIS pode consumir diretamente:
  - tabelas vetoriais nativas (`linhas_transmissao`, `estruturas`, `eventos_geo`, `geodata_outros`);
  - a view `public.vw_dashboard_geo_features`, que normaliza o catalogo para dashboards;
  - a tabela `public.rasters`, usando `footprint` para indexacao espacial e `url_cog`/`qgis_layer_uri` para o arquivo raster.
- Isso evita duplicacao entre "camada para operacao" e "camada para analise GIS".

## O que foi estruturado nesta retomada

- Migration nova: `apps/web/supabase/migrations/20260306110000_create_dashboard_geo_features.sql`
  - cria `public.rasters`;
  - adiciona indices espaciais e RLS;
  - publica `public.vw_dashboard_geo_features` com schema padrao para linhas, pontos, poligonos e footprints de raster.
- Front-end:
  - `useGeodataQuery` agora consulta a view unificada;
  - `lib/geodata.ts` normaliza `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon` e `MultiPolygon`;
  - o mapa do Dashboard ganhou overlays explicitos para:
    - `Linhas de Transmissao`
    - `Torres/Apoios`
    - `Pontos Geo (PostGIS)`
    - `Poligonos Geo (PostGIS)`
    - `Rasters / Footprints`
- Raster:
  - `RasterUpload` faz upload real para o bucket `geodata-uploads`;
  - `process-raster` aceita data simples ou timestamp ISO e persiste metadados minimos para QGIS.

## Aplicacao das migrations

- Script pronto no repositório: `pnpm supabase:web:push`
- Requisito: exportar `SUPABASE_DB_PASSWORD` antes de executar.
- O projeto ja esta linkado pelo `apps/web/supabase/config.toml`; o script faz:
  - `supabase db push`
  - `supabase migration list`

## Como conectar no QGIS

1. Criar a conexao PostgreSQL usando as credenciais do banco Supabase/Postgres.
2. Abrir as tabelas vetoriais brutas quando a analise exigir edicao ou auditoria detalhada.
3. Abrir a view `vw_dashboard_geo_features` quando o objetivo for reproduzir a mesma camada semantica do dashboard.
4. Para raster, usar:
   - `public.rasters` para localizar `url_cog`, `ts_acquired`, `line_code` e `footprint`;
   - `url_cog`/`qgis_layer_uri` como referencia do arquivo.

## Mapeamento recomendado por dashboard

- `Dashboard Principal`:
  - linhas, torres, pontos geo operacionais, poligonos de concessao/evento e footprints raster.
- `Ambiental`:
  - rasters NDVI/VARI/DEM, poligonos de ocupacao/alagamento e eventos georreferenciados.
- `Estrutura`:
  - linhas, estruturas, cruzamentos, midia georreferenciada e rasters de inspeção quando existirem.

## Proximos passos recomendados

1. Popular `footprint` nos rasters durante o processamento real com GDAL/rio-cogeo.
2. Publicar tiles COG/TMS quando for necessario visualizar o raster inteiro no MapLibre, nao apenas o footprint.
3. Evoluir `custom-layer-upload` para também publicar vetores processados no PostGIS, nao somente em Storage.
4. Criar presets por dashboard usando `dashboard_contexts` e filtros de `empresa`, `regiao` e `line_code`.
