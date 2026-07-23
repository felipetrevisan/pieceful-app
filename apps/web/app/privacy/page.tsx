"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="legal-page">
        <span className="section-kicker">{t("PRIVACIDADE E SEGURANÇA", "PRIVACY AND SAFETY")}</span>
        <h1>{t("Política de Privacidade", "Privacy Policy")}</h1>
        <p className="legal-updated">
          {t("Última atualização: 23 de julho de 2026", "Last updated: July 23, 2026")}
        </p>
        <p>
          {t(
            "Esta política explica como a Perazzo Labs trata informações no Pieceful, incluindo o aplicativo Android e a experiência web. Ao usar o Pieceful, você concorda com as práticas descritas abaixo.",
            "This policy explains how Perazzo Labs handles information in Pieceful, including the Android app and web experience. By using Pieceful, you agree to the practices described below.",
          )}
        </p>

        <section>
          <h2>{t("1. Responsável pelo tratamento", "1. Data controller")}</h2>
          <p>
            {t(
              "O Pieceful é publicado pela Perazzo Labs, Brasil. Para assuntos de privacidade, entre em contato pelo e-mail",
              "Pieceful is published by Perazzo Labs, Brazil. For privacy matters, contact",
            )}{" "}
            <a href="mailto:perazzolabs@gmail.com">perazzolabs@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>{t("2. Informações que tratamos", "2. Information we process")}</h2>
          <ul>
            <li>
              {t(
                "Conta: identificador, nome, e-mail e foto fornecidos pelo Google ou Microsoft quando você escolhe entrar.",
                "Account: identifier, name, email, and picture provided by Google or Microsoft when you choose to sign in.",
              )}
            </li>
            <li>
              {t(
                "Perfil e recursos sociais: nome de exibição, avatar, biografia, XP, conquistas, amizades e status recente de atividade.",
                "Profile and social features: display name, avatar, bio, XP, achievements, friendships, and recent activity status.",
              )}
            </li>
            <li>
              {t(
                "Puzzles: fotos selecionadas, nome do puzzle, configuração, posição das peças, tempo, dicas, progresso e timelapse. Para usuários conectados elegíveis, esses dados podem ser sincronizados de forma privada para permitir continuidade entre dispositivos.",
                "Puzzles: selected photos, puzzle name, configuration, piece positions, time, hints, progress, and timelapse. For eligible signed-in users, this data may be privately synced to continue across devices.",
              )}
            </li>
            <li>
              {t(
                "Preferências locais: faixa etária, idioma, tema, acessibilidade e conclusão do tutorial. A data de nascimento não é solicitada.",
                "Local preferences: age range, language, theme, accessibility settings, and tutorial completion. We do not request a birth date.",
              )}
            </li>
            <li>
              {t(
                "Compras: produto adquirido, situação da assinatura e direitos Premium, processados pelo Google Play e RevenueCat. Não recebemos os dados completos do seu cartão.",
                "Purchases: purchased product, subscription status, and Premium entitlements, processed by Google Play and RevenueCat. We do not receive your full payment-card details.",
              )}
            </li>
            <li>
              {t(
                "Anúncios e dados técnicos: identificadores e informações de dispositivo necessários para entregar, limitar e medir anúncios recompensados por meio do Google AdMob. O Pieceful solicita anúncios não personalizados.",
                "Ads and technical data: device information and identifiers needed to deliver, limit, and measure rewarded ads through Google AdMob. Pieceful requests non-personalized ads.",
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t("3. Como usamos as informações", "3. How we use information")}</h2>
          <p>
            {t(
              "Usamos as informações para criar e salvar puzzles, autenticar usuários, sincronizar progresso, calcular XP e conquistas, oferecer recursos sociais, processar o Premium, conceder dicas após anúncios, prevenir abuso, solucionar falhas e cumprir obrigações legais. Não vendemos informações pessoais.",
              "We use information to create and save puzzles, authenticate users, sync progress, calculate XP and achievements, provide social features, process Premium, grant hints after ads, prevent abuse, troubleshoot failures, and comply with legal obligations. We do not sell personal information.",
            )}
          </p>
        </section>

        <section>
          <h2>{t("4. Crianças e adolescentes", "4. Children and teens")}</h2>
          <p>
            {t(
              "A tela inicial pede apenas uma faixa etária de maneira neutra. No modo infantil, o Pieceful não oferece login, perfil social, amigos ou sincronização em nuvem; puzzles e preferências permanecem no aparelho. Anúncios recompensados são opcionais, não personalizados, marcados como direcionados a crianças e limitados à classificação de conteúdo G. Compras exigem confirmação de um responsável e também estão sujeitas aos controles da família do Google Play.",
              "The opening screen asks only for an age range in a neutral way. In child mode, Pieceful does not offer sign-in, social profiles, friends, or cloud sync; puzzles and preferences remain on the device. Rewarded ads are optional, non-personalized, marked as child-directed, and limited to G-rated content. Purchases require guardian confirmation and are also subject to Google Play family controls.",
            )}
          </p>
        </section>

        <section>
          <h2>{t("5. Compartilhamento e prestadores", "5. Sharing and service providers")}</h2>
          <p>
            {t(
              "Compartilhamos somente o necessário com provedores que operam partes do serviço: Supabase (autenticação, banco de dados e armazenamento), Google e Microsoft (login), Google Play Services e Google Play Games, Google AdMob (anúncios), RevenueCat e Google Play Billing (assinaturas). Esses provedores tratam dados de acordo com seus próprios termos e políticas.",
              "We share only what is necessary with providers that operate parts of the service: Supabase (authentication, database, and storage), Google and Microsoft (sign-in), Google Play Services and Google Play Games, Google AdMob (ads), and RevenueCat and Google Play Billing (subscriptions). These providers process data under their own terms and policies.",
            )}
          </p>
        </section>

        <section>
          <h2>
            {t("6. Armazenamento, segurança e retenção", "6. Storage, security, and retention")}
          </h2>
          <p>
            {t(
              "Fotos sincronizadas de puzzles são mantidas em armazenamento privado e acessadas por links temporários. Aplicamos controles de acesso por usuário e conexões criptografadas. Nenhum sistema é completamente imune a riscos. Mantemos dados da conta enquanto ela estiver ativa ou pelo período necessário para operar o serviço e cumprir obrigações legais; dados locais permanecem até serem apagados no app ou na desinstalação.",
              "Synced puzzle photos are kept in private storage and accessed through temporary links. We use per-user access controls and encrypted connections. No system is completely risk-free. We retain account data while the account is active or as needed to operate the service and meet legal obligations; local data remains until deleted in the app or upon uninstalling.",
            )}
          </p>
        </section>

        <section>
          <h2>{t("7. Suas escolhas e direitos", "7. Your choices and rights")}</h2>
          <p>
            {t(
              "Você pode alterar o perfil, excluir puzzles locais, sair da conta ou excluir permanentemente a conta e os dados sincronizados em Configurações. Também pode solicitar acesso, correção ou exclusão pelo contato de privacidade. Consulte a",
              "You can edit your profile, delete local puzzles, sign out, or permanently delete your account and synced data in Settings. You may also request access, correction, or deletion through our privacy contact. See the",
            )}{" "}
            <Link href="/account-deletion">
              {t("página de exclusão de conta", "account deletion page")}
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>{t("8. Transferências e alterações", "8. Transfers and changes")}</h2>
          <p>
            {t(
              "Nossos prestadores podem tratar dados em outros países, com as proteções previstas em seus contratos e na legislação aplicável. Podemos atualizar esta política quando o Pieceful mudar; a data acima indicará a versão mais recente.",
              "Our providers may process data in other countries, subject to safeguards in their contracts and applicable law. We may update this policy as Pieceful changes; the date above identifies the latest version.",
            )}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
