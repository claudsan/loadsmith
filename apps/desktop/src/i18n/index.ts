import { create } from "zustand";
import { enUS } from "./locales/enUS";
import { esES } from "./locales/esES";
import { ptBR } from "./locales/ptBR";
import type { SupportedLanguage, TranslationDict, TranslationKey } from "./types";

export type { SupportedLanguage, TranslationDict, TranslationKey } from "./types";

export const LANGUAGE_STORAGE_KEY = "loadsmith_language";

const DICTIONARIES: Record<SupportedLanguage, TranslationDict> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
};

export function resolveSupportedLanguage(
  candidates: readonly (string | undefined | null)[]
): SupportedLanguage {
  for (const raw of candidates) {
    const code = (raw ?? "").trim().toLowerCase();
    if (!code) continue;
    if (code.startsWith("pt")) return "pt-BR";
    if (code.startsWith("es")) return "es-ES";
    if (code.startsWith("en")) return "en-US";
  }
  return "en-US";
}

export function hasSavedLanguagePreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === "pt-BR" || saved === "en-US" || saved === "es-ES";
  } catch {
    return false;
  }
}

export function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "en-US";
  }
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "pt-BR" || saved === "en-US" || saved === "es-ES") {
      return saved;
    }
    const intlLocale =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "";
    const navLanguages = Array.isArray(navigator.languages) ? navigator.languages : [];
    return resolveSupportedLanguage([...navLanguages, navigator.language, intlLocale]);
  } catch {
    return "en-US";
  }
}

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignora erro de quota
    }
    set({ language: lang });
  },
}));

// Em ambiente Electron, refina o idioma inicial usando os idiomas nativos do SO caso o usuário ainda não tenha escolhido manualmente.
if (typeof window !== "undefined" && !hasSavedLanguagePreference()) {
  const getLocales = window.loadsmith?.windowControls?.getSystemLocales;
  if (typeof getLocales === "function") {
    void getLocales()
      .then((osLocales) => {
        if (!hasSavedLanguagePreference() && Array.isArray(osLocales) && osLocales.length > 0) {
          const detected = resolveSupportedLanguage(osLocales);
          if (detected !== useLanguageStore.getState().language) {
            useLanguageStore.setState({ language: detected });
          }
        }
      })
      .catch(() => {
        // Ignora silenciosamente fora do contexto Electron
      });
  }
}

export function translate(
  key: TranslationKey,
  params?: Record<string, string | number>,
  lang?: SupportedLanguage
): string {
  const activeLang = lang ?? useLanguageStore.getState().language;
  const dict = DICTIONARIES[activeLang] ?? ptBR;
  let text = dict[key] ?? ptBR[key] ?? String(key);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function useI18n() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(key, params, language);
  return { language, setLanguage, t };
}
