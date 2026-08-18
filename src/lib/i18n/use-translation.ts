"use client";

// Translation hook for the IITGN Walk app.
//
// Reads the active language from localStorage (`iitgn-language`, default "en")
// and exposes `t(key)` for client components.
//
// Three languages are supported: English (en), Hindi (hi), Gujarati (gu).
// Gujarati is included because IITGN support staff and many Gandhinagar
// residents speak it locally.
//
// Falls back to English if a Hindi/Gujarati translation is missing, and to the
// key itself if the key is unknown (so developers spot missing keys immediately).

import { useCallback, useEffect, useState } from "react";
import { translate, type Dict, type Lang, type TranslationKey } from "./strings";

const LANG_KEY = "iitgn-language";

/** Locale metadata used to render the language picker / toggle. */
export interface LocaleMeta {
  code: Lang;
  /** Native-language label shown in the UI (already translated). */
  label: string;
  /** Emoji flag — Gujarati shares the Indian flag with Hindi & English. */
  flag: string;
}

/**
 * Ordered list of supported locales. The page-level language toggle cycles
 * through this array in order. The label is the language's own endonym so a
 * native speaker can spot their language even when the UI is in English.
 */
export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "English", flag: "🇮🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
];

/**
 * Lazy string-table loaders. The current hook reads `translations` directly
 * (a single bundled module) so these loaders are not invoked at runtime —
 * but exporting them gives type-checking a second audit point (each `Lang`
 * must resolve to a real `Dict`) and lets a future code-split migration swap
 * the eager import for these dynamic ones without touching callers.
 */
export const loaders: Record<Lang, () => Promise<Dict>> = {
  en: () => import("./strings").then((m) => m.translations.en),
  hi: () => import("./strings").then((m) => m.translations.hi),
  gu: () => import("./strings").then((m) => m.translations.gu),
};

function readLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "hi" || v === "gu") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

export interface UseTranslation {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

/** Re-export so callers can name the union without circular imports. */
export type { Lang, TranslationKey } from "./strings";

export function useTranslation(): UseTranslation {
  // Lazy initialiser: read saved language on the client only. On the server
  // we default to "en" so the initial markup matches the post-hydration render
  // when the user has not yet toggled language.
  const [lang, setLangState] = useState<Lang>(() =>
    typeof window !== "undefined" ? readLang() : "en",
  );

  // Cross-tab sync: if another tab changes the language, mirror it here.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LANG_KEY) setLangState(readLang());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(lang, key),
    [lang],
  );

  return { lang, setLang, t };
}
