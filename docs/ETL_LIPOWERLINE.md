# ETL LiPowerline - Fase 2

## Arquivos de entrada suportados

| Tipo | Exemplo | Onde guardar | Observações |
| --- | --- | --- | --- |
| KML/KMZ - traçado e estruturas | `linha.kml` (ver `data/lipowerline_samples/demo`) | Mesma pasta do dataset | Linhas (`LineString`) alimentam `stg_kml_linha`; pontos (`Point`) alimentam `stg_kml_estrutura`. |
| KML - faixas tratadas | `treated.kml` | Opcional | Usado para `stg_kml_tratado` → `tb_tratamento_vegetacao`. |
| CSV/GeoJSON - vegetação | `vegetacao.csv` | Opcional | Se ausente copiamos os dados de risco (`stg_csv_risco_vegetacao`). |
| CSV - risco vegetação (clearance) | `vegetacao_risco.csv` | Obrigatório no fluxo mínimo | Contém `tree_id`, `vao_codigo`, distâncias, classes. |
| CSV - risco queda lateral | `danger_trees.csv` | Opcional (pipeline preparado) | Populará `stg_csv_queda_lateral` em fases futuras. |
| CSV - cruzamentos | `crossings.csv` | Opcional | Alimenta `stg_csv_cruzamentos`. |

Coloque todos os arquivos em uma pasta (ex.: `data/lipowerline_samples/demo`). O CLI tenta autodetectar cada tipo por nome; use `--file-*` para forçar caminhos específicos.

## Arquitetura em 3 camadas

1. **Staging (`stg_*`)** - copia quase crua dos arquivos: cada feature/linha vira um registro com `raw jsonb`, nome do arquivo e geometria (`geometry(Point/LineString/Geometry, 4326)`).
2. **Normalização (`tb_*`)** - modelo relacional canônico: linhas, estruturas, vãos, cenários, árvores e riscos. Também registramos datasets em `tb_lipowerline_dataset` para auditar execuções.
3. **Views analíticas (`vw_*`)** - projeções prontas para o dashboard: KPIs da linha, vãos coloridos por clearance, pontos de perigosa queda lateral e trechos tratados.

```
Arquivo KML/CSV → stg_* → tb_* → vw_*
```

## Tabelas principais

- `tb_linha`, `tb_estrutura`, `tb_vao`: cadastro físico (com `geom` e metadados LiPowerline).
- `tb_cenario`: pré/pós/simulado com data de referência e status.
- `tb_elemento_vegetacao`: árvores/pontos monitorados por linha/vão.
- `tb_risco_vegetacao_vao`: métricas de clearance ligadas ao cenário.
- `tb_risco_queda_lateral`, `tb_cruzamento`, `tb_tratamento_vegetacao`: extensões para danger trees, cruzamentos e trechos pós-manejo.
- `tb_lipowerline_dataset`: log de ingestões (quem, quando, quais arquivos, status).

Todas as DDL + views residem em `packages/db/migrations/0001_lipowerline.sql`.

## Rodando migrations e ETL mínimo

```bash
# 1) Configure DATABASE_URL em apps/api/.env (PostgreSQL + PostGIS)
# 2) Migre o schema
pnpm db:migrate

# 3) Execute o ETL apontando para a pasta do dataset
pnpm -C apps/api tsx src/scripts/import-lipowerline.ts \
  --dataset data/lipowerline_samples/demo \
  --line LT-DEMO-01 \
  --line-name "Linha Demo 138 kV" \
  --tensao 138 \
  --cenario "Pré-manejo 2025-01" \
  --cenario-type pre_manejo
```

Flags úteis do CLI:

- `--file-line-kml`, `--file-structures-kml`, `--file-treated-kml`.
- `--file-vegetacao-csv`, `--file-risco-csv`, `--file-queda-csv`, `--file-cruzamento-csv`.
- `--cenario-date YYYY-MM-DD`, `--cenario-status ativo|arquivado`.
- `--created-by <nome>` para rastrear quem importou.

A saída informa quantos registros entraram em cada camada (`Stage`, `Normalize`).

## ETL dentro do código

- Implementação central: `apps/api/src/etl/lipowerline` (parsers, staging, normalização, utils).
- CLI: `apps/api/src/scripts/import-lipowerline.ts` (script registrado como `pnpm -C apps/api etl:lipowerline`).
- Novas rotas: `apps/api/src/routes/lipowerline.ts` expõe `/api/linhas`, `/api/cenarios`, `/api/kpi-linha`, `/api/risco-vegetacao`, `/api/risco-queda`, `/api/cruzamentos`, `/api/tratamentos`.

## Fluxo resumido

1. **createDatasetRecord** grava o lote em `tb_lipowerline_dataset` com os caminhos dos arquivos.
2. **stageFiles** lê KML/CSV, detecta geometria e alimenta as tabelas `stg_*` (copiando risco → vegetação quando necessário).
3. **normalizeDataset**:
   - Garante `tb_linha` (geom + metadados), `tb_cenario` e `tb_estrutura`.
   - Gera vãos automaticamente a partir da ordem das estruturas.
   - Upserta vegetação/riscos e associa os vãos corretos.
   - Popular `tb_tratamento_vegetacao` quando existem KMZ/KML tratados.
4. **Views analíticas** ficam prontas para o dashboard consumir via `/api/*`.

> Próximas fases podem estender o pipeline adicionando parsing de KMZ, cruzamentos detalhados e cálculo automático de cenários pós-manejo. O esqueleto já está preparado para novas tabelas/arquivos (basta criar scripts adicionais em `apps/api/src/etl/lipowerline`).
