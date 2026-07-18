"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { readPreferences } from "./preferences";

export type Language = "pt-BR" | "en";

interface I18nValue {
  language: Language;
  locale: "pt-BR" | "en-US";
  t: (portuguese: string, english: string) => string;
}

const I18nContext = createContext<I18nValue>({
  language: "pt-BR",
  locale: "pt-BR",
  t: (portuguese) => portuguese,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("pt-BR");

  useEffect(() => {
    const sync = () => setLanguage(readPreferences(localStorage).language);
    sync();
    window.addEventListener("pieceful:language-changed", sync);
    return () => window.removeEventListener("pieceful:language-changed", sync);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      locale: language === "en" ? "en-US" : "pt-BR",
      t: (portuguese, english) => (language === "en" ? english : portuguese),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LocalizedText({ portuguese, english }: { portuguese: string; english: string }) {
  const { t } = useI18n();
  return t(portuguese, english);
}
