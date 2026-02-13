import type {
  VegActionStatus,
  VegAnomalyStatus,
  VegAnomalyType,
  VegDocType,
  VegSource,
  VegScheduleStatus,
  VegSeverity,
} from "@/modules/vegetacao/api/vegetacaoApi";

export type VegTranslator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const fallback = (value: string) => value;

export const vegEnumLabel = {
  severity: (t: VegTranslator, value: VegSeverity) => t(`vegetacao.enums.severity.${value}`) || fallback(value),
  anomalyStatus: (t: VegTranslator, value: VegAnomalyStatus) => t(`vegetacao.enums.anomalyStatus.${value}`) || fallback(value),
  anomalyType: (t: VegTranslator, value: VegAnomalyType) => t(`vegetacao.enums.anomalyType.${value}`) || fallback(value),
  source: (t: VegTranslator, value: VegSource) => t(`vegetacao.enums.source.${value}`) || fallback(value),
  actionStatus: (t: VegTranslator, value: VegActionStatus) => t(`vegetacao.enums.actionStatus.${value}`) || fallback(value),
  scheduleStatus: (t: VegTranslator, value: VegScheduleStatus) => t(`vegetacao.enums.scheduleStatus.${value}`) || fallback(value),
  docType: (t: VegTranslator, value: VegDocType) => t(`vegetacao.enums.docType.${value}`) || fallback(value),
} as const;
