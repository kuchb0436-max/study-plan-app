import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en, TranslationDict, TranslationKey } from './locales/en';
import { DEFAULT_LANGUAGE_CODE, getLanguageMeta, SUPPORTED_LANGUAGES } from './languages';
import { LanguageDirection, LanguageMeta } from './types';

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguageMeta } from './languages';
export type { LanguageMeta, LanguageDirection } from './types';
export type { TranslationKey, TranslationDict } from './locales/en';

export const LANGUAGE_STORAGE_KEY = 'studyflow_language';

const LOCALE_CACHE: Record<string, TranslationDict> = {
  en,
};

const LOCALE_LOADERS: Record<string, () => Promise<TranslationDict>> = {
  en: async () => en,
  hi: () => import('./locales/hi').then((m) => m.hi),
  ur: () => import('./locales/ur').then((m) => m.ur),
  ar: () => import('./locales/ar').then((m) => m.ar),
  es: () => import('./locales/es').then((m) => m.es),
  fr: () => import('./locales/fr').then((m) => m.fr),
  de: () => import('./locales/de').then((m) => m.de),
  pt: () => import('./locales/pt').then((m) => m.pt),
  ru: () => import('./locales/ru').then((m) => m.ru),
  'zh-CN': () => import('./locales/zh-CN').then((m) => m.zhCN),
  'zh-TW': () => import('./locales/zh-TW').then((m) => m.zhTW),
  ja: () => import('./locales/ja').then((m) => m.ja),
  ko: () => import('./locales/ko').then((m) => m.ko),
  bn: () => import('./locales/bn').then((m) => m.bn),
  tr: () => import('./locales/tr').then((m) => m.tr),
  id: () => import('./locales/id').then((m) => m.id),
  it: () => import('./locales/it').then((m) => m.it),
  nl: () => import('./locales/nl').then((m) => m.nl),
  pl: () => import('./locales/pl').then((m) => m.pl),
  vi: () => import('./locales/vi').then((m) => m.vi),
  th: () => import('./locales/th').then((m) => m.th),
  ms: () => import('./locales/ms').then((m) => m.ms),
  fa: () => import('./locales/fa').then((m) => m.fa),
  he: () => import('./locales/he').then((m) => m.he),
  uk: () => import('./locales/uk').then((m) => m.uk),
  pa: () => import('./locales/pa').then((m) => m.pa),
  ta: () => import('./locales/ta').then((m) => m.ta),
  te: () => import('./locales/te').then((m) => m.te),
  mr: () => import('./locales/mr').then((m) => m.mr),
  sw: () => import('./locales/sw').then((m) => m.sw),
};

function matchLanguageTag(rawTag: string | undefined | null): string | null {
  if (!rawTag || typeof rawTag !== 'string') return null;
  const tag = rawTag.trim().replace(/_/g, '-');
  if (!tag) return null;
  const lower = tag.toLowerCase();

  // Exact match
  const exact = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;

  // Chinese script/region mapping
  if (lower.startsWith('zh')) {
    if (
      lower.includes('hant') ||
      lower.endsWith('-tw') ||
      lower.endsWith('-hk') ||
      lower.endsWith('-mo')
    ) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }

  // Legacy/alias tags
  if (lower === 'in' || lower.startsWith('in-')) return 'id';
  if (lower === 'iw' || lower.startsWith('iw-')) return 'he';

  // Primary subtag match (e.g., hi-IN -> hi)
  const primary = lower.split('-')[0];
  const primaryMatch = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === primary);
  if (primaryMatch) return primaryMatch.code;

  return null;
}

export function detectDeviceLanguage(): string {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE_CODE;
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }
  for (const tag of candidates) {
    const matched = matchLanguageTag(tag);
    if (matched) return matched;
  }
  return DEFAULT_LANGUAGE_CODE;
}

export function getStoredLanguageOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!stored) return null;
    return matchLanguageTag(stored);
  } catch {
    return null;
  }
}

export function resolveInitialLanguageCode(): { code: string; isAuto: boolean } {
  const override = getStoredLanguageOverride();
  if (override) {
    return { code: override, isAuto: false };
  }
  return { code: detectDeviceLanguage(), isAuto: true };
}

export async function loadLocaleDictionary(code: string): Promise<TranslationDict> {
  if (LOCALE_CACHE[code]) {
    return LOCALE_CACHE[code];
  }
  const loader = LOCALE_LOADERS[code];
  if (!loader) {
    return en;
  }
  try {
    const dict = await loader();
    LOCALE_CACHE[code] = dict;
    return dict;
  } catch {
    return en;
  }
}

function applyDocumentLanguageAttributes(meta: LanguageMeta): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
}

export async function preloadInitialLocale(): Promise<void> {
  const { code } = resolveInitialLanguageCode();
  const meta = getLanguageMeta(code);
  applyDocumentLanguageAttributes(meta);
  await loadLocaleDictionary(meta.code);
}

export function translate(
  dict: TranslationDict,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : `{${token}}`
  );
}

export interface I18nContextValue {
  language: LanguageMeta;
  languageCode: string;
  dir: LanguageDirection;
  isAutoDetected: boolean;
  isLoadingLocale: boolean;
  supportedLanguages: LanguageMeta[];
  setLanguage: (code: string) => void;
  setAutoLanguage: () => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  formatNum: (value: number) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: SUPPORTED_LANGUAGES[0],
  languageCode: DEFAULT_LANGUAGE_CODE,
  dir: 'ltr',
  isAutoDetected: true,
  isLoadingLocale: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
  setLanguage: () => {},
  setAutoLanguage: () => {},
  t: (key, vars) => translate(en, key, vars),
  formatNum: (value) => String(value),
});

export function I18nProvider({
  children,
  initialCode,
}: {
  children: React.ReactNode;
  initialCode?: string;
}) {
  const resolved = useMemo(() => {
    if (initialCode) {
      const matched = matchLanguageTag(initialCode) ?? DEFAULT_LANGUAGE_CODE;
      return { code: matched, isAuto: false };
    }
    return resolveInitialLanguageCode();
  }, [initialCode]);

  const [languageCode, setLanguageCode] = useState<string>(resolved.code);
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(resolved.isAuto);
  const [dict, setDict] = useState<TranslationDict>(
    () => LOCALE_CACHE[resolved.code] ?? en
  );
  const [isLoadingLocale, setIsLoadingLocale] = useState<boolean>(
    () => !LOCALE_CACHE[resolved.code]
  );

  const meta = useMemo(() => getLanguageMeta(languageCode), [languageCode]);

  useEffect(() => {
    applyDocumentLanguageAttributes(meta);
    let cancelled = false;

    if (LOCALE_CACHE[meta.code]) {
      setDict(LOCALE_CACHE[meta.code]);
      setIsLoadingLocale(false);
      return;
    }

    setIsLoadingLocale(true);
    loadLocaleDictionary(meta.code).then((loaded) => {
      if (!cancelled) {
        setDict(loaded);
        setIsLoadingLocale(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [meta]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      const next = resolveInitialLanguageCode();
      setLanguageCode(next.code);
      setIsAutoDetected(next.isAuto);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLanguage = useCallback((code: string) => {
    const matched = matchLanguageTag(code) ?? DEFAULT_LANGUAGE_CODE;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, matched);
      }
    } catch {
      // Ignore storage write errors
    }
    setIsAutoDetected(false);
    setLanguageCode(matched);
  }, []);

  const setAutoLanguage = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage removal errors
    }
    setIsAutoDetected(true);
    setLanguageCode(detectDeviceLanguage());
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(dict, key, vars),
    [dict]
  );

  const formatNum = useCallback(
    (value: number) => {
      try {
        return new Intl.NumberFormat(meta.intlLocale).format(value);
      } catch {
        return String(value);
      }
    },
    [meta.intlLocale]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      language: meta,
      languageCode: meta.code,
      dir: meta.dir,
      isAutoDetected,
      isLoadingLocale,
      supportedLanguages: SUPPORTED_LANGUAGES,
      setLanguage,
      setAutoLanguage,
      t,
      formatNum,
    }),
    [meta, isAutoDetected, isLoadingLocale, setLanguage, setAutoLanguage, t, formatNum]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
