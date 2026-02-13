export const SUPPORTED_LOCALES = ["pt-BR", "en-US", "zh-CN"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";

export const LOCALE_LABELS: Record<Locale, { short: string; label: string }> = {
  "pt-BR": { short: "PT-BR", label: "Português (BR)" },
  "en-US": { short: "EN", label: "English (US)" },
  "zh-CN": { short: "中文", label: "中文（简体）" },
};

