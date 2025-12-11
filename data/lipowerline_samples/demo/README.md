# Dataset demo - LiPowerline

Arquivos fictícios usados pelo fluxo ETL mínimo:

- `linha.kml`: contém o traçado da LT e três estruturas (TR-01/02/03).
- `vegetacao_risco.csv`: dois pontos de vegetação simulando saídas do LiPowerline.

Execute o ETL apontando para esta pasta:

```bash
pnpm db:migrate
pnpm -C apps/api tsx src/scripts/import-lipowerline.ts \
  --dataset data/lipowerline_samples/demo \
  --line LT-DEMO-01 \
  --line-name "Linha Demo 138 kV" \
  --tensao 138 \
  --cenario "Pré-manejo 2025-01" \
  --cenario-type pre_manejo
```

Os arquivos são leves e servem apenas para validar a tubulação (staging → normalização → views).
