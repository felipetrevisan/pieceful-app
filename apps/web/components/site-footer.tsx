"use client";

import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <span>© 2026 Pieceful</span>
      <span>
        {t(
          "Suas fotos ficam no seu dispositivo · Privacidade",
          "Your photos stay on your device · Privacy",
        )}
      </span>
    </footer>
  );
}
