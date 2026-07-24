"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useI18n } from "@/lib/i18n";

export default function AccountDeletionPage() {
  const { t } = useI18n();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="legal-page compact-legal-page">
        <span className="section-kicker">{t("CONTROLE DOS SEUS DADOS", "CONTROL YOUR DATA")}</span>
        <h1>{t("Excluir conta do Pieceful", "Delete your Pieceful account")}</h1>
        <p>
          {t(
            "A exclusão é permanente e remove o perfil, quebra-cabeças e fotos sincronizados, amizades e conquistas vinculados à conta.",
            "Deletion is permanent and removes the profile, synced puzzles and photos, friendships, and achievements linked to the account.",
          )}
        </p>
        <section>
          <h2>{t("Excluir pelo aplicativo", "Delete in the app")}</h2>
          <ol>
            <li>
              {t(
                "Abra o Pieceful e entre na sua conta.",
                "Open Pieceful and sign in to your account.",
              )}
            </li>
            <li>{t("Abra o menu e acesse Configurações.", "Open the menu and go to Settings.")}</li>
            <li>
              {t(
                "Toque em “Excluir conta e dados da nuvem”.",
                "Tap “Delete account and cloud data.”",
              )}
            </li>
            <li>
              {t(
                "Leia o aviso e confirme a exclusão definitiva.",
                "Read the warning and confirm permanent deletion.",
              )}
            </li>
          </ol>
        </section>
        <section>
          <h2>{t("Se você não consegue acessar o app", "If you cannot access the app")}</h2>
          <p>
            {t(
              "Envie uma solicitação usando o e-mail da conta para",
              "Send a request from the email associated with your account to",
            )}{" "}
            <a href="mailto:perazzolabs@gmail.com?subject=Exclus%C3%A3o%20de%20conta%20Pieceful">
              perazzolabs@gmail.com
            </a>
            .{" "}
            {t(
              "Poderemos pedir uma confirmação para proteger sua conta contra exclusões indevidas.",
              "We may request confirmation to protect your account from unauthorized deletion.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("O que pode permanecer", "What may remain")}</h2>
          <p>
            {t(
              "Podemos conservar registros mínimos quando exigidos por lei, para prevenção de fraude ou resolução de disputas. Compras e transações mantidas pelo Google Play seguem a política de retenção do Google. Dados armazenados apenas no aparelho podem ser removidos nas Configurações ou ao desinstalar o app.",
              "We may retain minimal records when legally required, for fraud prevention, or dispute resolution. Purchases and transactions retained by Google Play follow Google's retention policy. Data stored only on the device can be removed in Settings or by uninstalling the app.",
            )}
          </p>
        </section>
        <Link className="secondary-button legal-back" href="/privacy">
          {t("Ver Política de Privacidade", "View Privacy Policy")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
