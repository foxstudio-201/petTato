/**
 * Offline i18n loader. Each language lives in its own file under `locales/`.
 * Keys are the canonical English source text, so `T(lang, 'Dashboard')` works
 * and any key missing from a translation falls back to English, then to the key
 * itself — so the UI never shows a blank.
 */
import en from './locales/en'
import vi from './locales/vi'

export const LANGUAGES: { code: string; label: string; recognition: string }[] = [
  { code: 'en', label: 'English', recognition: 'en-US' },
  { code: 'vi', label: 'Tiếng Việt', recognition: 'vi-VN' }
]

const DICTS: Record<string, Record<string, string>> = { en, vi }

export function T(lang: string, key: string): string {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key
}
