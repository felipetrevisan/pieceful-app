"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <span>© 2026 Pieceful</span>
      <span className="footer-links">
        <Link href="/privacy">{t("Privacidade", "Privacy")}</Link>
        <Link href="/account-deletion">{t("Excluir conta", "Delete account")}</Link>
      </span>
    </footer>
  );
}
