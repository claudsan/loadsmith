import type { ptBR } from "./locales/ptBR";

export type SupportedLanguage = "pt-BR" | "en-US" | "es-ES";
export type TranslationKey = keyof typeof ptBR;
export type TranslationDict = Record<TranslationKey, string>;
