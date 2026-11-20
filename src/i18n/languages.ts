import { LanguageMeta } from './types';

export const DEFAULT_LANGUAGE_CODE = 'en';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', intlLocale: 'en-US' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', intlLocale: 'hi-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', intlLocale: 'ur-PK' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', intlLocale: 'ar-SA' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', intlLocale: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', intlLocale: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', intlLocale: 'de-DE' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', intlLocale: 'pt-BR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', intlLocale: 'ru-RU' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', intlLocale: 'zh-CN' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', dir: 'ltr', intlLocale: 'zh-TW' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', intlLocale: 'ja-JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', intlLocale: 'ko-KR' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', intlLocale: 'bn-BD' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', intlLocale: 'tr-TR' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', intlLocale: 'id-ID' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', intlLocale: 'it-IT' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', intlLocale: 'nl-NL' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', intlLocale: 'pl-PL' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', intlLocale: 'vi-VN' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr', intlLocale: 'th-TH' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr', intlLocale: 'ms-MY' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', intlLocale: 'fa-IR' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', intlLocale: 'he-IL' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr', intlLocale: 'uk-UA' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', intlLocale: 'pa-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', intlLocale: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', intlLocale: 'te-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', intlLocale: 'mr-IN' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr', intlLocale: 'sw-KE' },
];

export const LANGUAGE_META_MAP = new Map<string, LanguageMeta>(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang])
);

export function getLanguageMeta(code: string): LanguageMeta {
  return LANGUAGE_META_MAP.get(code) ?? SUPPORTED_LANGUAGES[0];
}
