export type LanguageDirection = 'ltr' | 'rtl';

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  dir: LanguageDirection;
  intlLocale: string;
}
