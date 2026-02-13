import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from "@/i18n/locales";
import { MESSAGES } from "@/i18n/messages";

const STORAGE_KEY = "smartline-locale";

const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if ((SUPPORTED_LOCALES as readonly string[]).includes(trimmed)) return trimmed as Locale;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("en")) return "en-US";
  if (lower.startsWith("zh")) return "zh-CN";
  return null;
};

const detectLocale = (): Locale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // ignore
  }

  const navLang = normalizeLocale(window.navigator.language);
  if (navLang) return navLang;

  const navLangs = window.navigator.languages ?? [];
  for (const lang of navLangs) {
    const normalized = normalizeLocale(lang);
    if (normalized) return normalized;
  }

  return DEFAULT_LOCALE;
};

type I18nParams = Record<string, string | number | null | undefined>;

const getByPath = (obj: unknown, path: string): unknown => {
  const chunks = path.split(".").filter(Boolean);
  let current: any = obj;
  for (const chunk of chunks) {
    if (!current || typeof current !== "object") return undefined;
    current = current[chunk];
  }
  return current;
};

const interpolate = (template: string, params?: I18nParams) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    if (value === null || value === undefined) return match;
    return String(value);
  });
};

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: I18nParams) => string;
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const toDate = (value: Date | string | number): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, params?: I18nParams) => {
      const primary = getByPath(MESSAGES[locale], key);
      const fallback = getByPath(MESSAGES[DEFAULT_LOCALE], key);
      const value = (typeof primary === "string" ? primary : typeof fallback === "string" ? fallback : null);
      if (!value) return key;
      return interpolate(value, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => {
    const formatDateTime = (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = toDate(input);
      if (!date) return "";
      return date.toLocaleString(locale, options);
    };

    const formatDate = (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = toDate(input);
      if (!date) return "";
      return date.toLocaleDateString(locale, options);
    };

    const formatTime = (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = toDate(input);
      if (!date) return "";
      return date.toLocaleTimeString(locale, options);
    };

    const formatNumber = (input: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(input);

    return {
      locale,
      setLocale,
      t,
      formatDateTime,
      formatDate,
      formatTime,
      formatNumber,
    };
  }, [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
};

