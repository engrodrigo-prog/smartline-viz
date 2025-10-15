# Avaliação do sistema de mapas e monitoramento de queimadas

## Visão geral
- O front-end utiliza **Mapbox GL JS** com um componente unificado (`MapboxUnified`) capaz de habilitar diversas camadas temáticas (queimadas, infraestrutura, vegetação etc.) e traz recursos como terreno 3D, controle de navegação e limite estadual padrão, tudo configurado assim que o mapa é carregado.【F:src/components/MapboxUnified.tsx†L40-L144】
- O módulo de Queimadas consome dados através do hook `useQueimadas`, que consulta funções Edge do Supabase (`queimadas-live` e `queimadas-archive`) para retornar coleções GeoJSON com filtros de concessão, confiança, satélite e raio máximo. A interface sincroniza tabela e mapa, permitindo focar o mapa em um ponto selecionado na lista.【F:src/hooks/useQueimadas.ts†L14-L55】【F:src/pages/modules/ambiental/Queimadas.tsx†L344-L397】
- O back-end no Supabase expõe funções dedicadas para dados em tempo real (últimas 24h) e históricos, incluindo autenticação no modo histórico, filtragem por confiança/raio e conversão das geometrias WKT para GeoJSON consumível pelo front-end.【F:supabase/functions/queimadas-live/index.ts†L13-L89】【F:supabase/functions/queimadas-archive/index.ts†L13-L120】

## Pontos fortes
- A camada de queimadas no mapa aplica clustering, simbologia por zona de risco e interação (zoom em clusters, clique em pontos individuais) proporcionando boa experiência visual e navegação em diferentes escalas.【F:src/components/MapboxUnified.tsx†L547-L630】
- O hook `useQueimadas` define refetch automático a cada 30s no modo live, trata erros de rede com retries exponenciais e exige autenticação para o modo histórico, garantindo dados atualizados e acesso controlado.【F:src/hooks/useQueimadas.ts†L30-L55】【F:supabase/functions/queimadas-archive/index.ts†L13-L120】
- A página de Queimadas integra KPIs, filtros dinâmicos e foco cruzado lista→mapa, criando um fluxo operacional coeso para análise de ocorrências.【F:src/pages/modules/ambiental/Queimadas.tsx†L320-L407】

## Riscos e oportunidades de melhoria
- A função `loadQueimadas` do `MapboxUnified` ignora a API do Supabase e baixa diretamente o KML público da NASA FIRMS, parseando manualmente o XML. Embora útil como fallback/demo, isso duplica lógica e pode gerar divergências com os dados apresentados na tabela (que vêm da API oficial). Avaliar o consumo direto do hook ou da mesma função server-side para manter consistência.【F:src/components/MapboxUnified.tsx†L478-L575】
- A distância das queimadas até a infraestrutura é atualmente calculada com um valor aleatório (“demo”), o que compromete a classificação de zonas crítica/observação e qualquer tomada de decisão baseada nisso. É prioritário substituir por cálculo geoespacial real (ex.: ST_Distance no banco ou turf.js no front).【F:src/components/MapboxUnified.tsx†L533-L572】
- Existem dois componentes de mapa (`MapboxUnified` e `MapboxQueimadas`) com funcionalidades sobrepostas. O `MapboxUnified` já cobre clustering e filtros; consolidar os componentes pode reduzir manutenção duplicada e risco de comportamentos divergentes.【F:src/components/MapboxQueimadas.tsx†L12-L120】
- As funções Supabase convertem geometrias WKT via regex simples. Para maior robustez, considere usar `ST_AsGeoJSON` no SQL para evitar parse manual, especialmente se a geometria evoluir para tipos não pontuais.【F:supabase/functions/queimadas-live/index.ts†L48-L75】

## Recomendações rápidas
1. Reutilizar o resultado de `useQueimadas` (ou expor um serviço comum) dentro do mapa para manter paridade entre lista e camadas e reduzir chamadas externas redundantes.
2. Implementar cálculo real de distância e zona no back-end, enviando já os campos `distancia_m` e `zona` no GeoJSON.
3. Definir estratégia única de componente de mapa, com propriedades claras para habilitar camadas específicas, evitando variação entre `MapboxUnified` e `MapboxQueimadas`.
4. Ajustar as funções Edge para retornar erros amigáveis e logs estruturados, além de proteger melhor o modo live caso haja limites de quota no Supabase.

No geral, o projeto possui uma base sólida para visualização geoespacial de queimadas, com experiência rica no front-end. Ao alinhar a origem dos dados do mapa com o restante do sistema e substituir os placeholders por cálculos reais, o monitoramento ganhará confiabilidade operacional.
