import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemeCatalog, mobileThemes } from "@/constants/pieceful-theme";
import { type AppLanguage, type MobileTheme, useApp } from "@/state/app-provider";
import { useMonetization } from "@/state/monetization-provider";
import { useSocial } from "@/state/social-provider";

export default function SettingsScreen() {
  const {
    ageGroup,
    deleteLocalPuzzles,
    language,
    preferences,
    puzzles,
    resetAgeGroup,
    setLanguage,
    setTheme,
    startTour,
    t,
    theme,
    updatePreference,
  } = useApp();
  const {
    error: monetizationError,
    offering,
    premium,
    purchaseAvailable,
    purchasePremium,
    restorePurchases,
  } = useMonetization();
  const { busy: accountBusy, deleteAccount, session } = useSocial();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const { width: screenWidth } = useWindowDimensions();
  const helpRowWidth = Math.max(0, screenWidth - 40);
  const helpCardWidth = Math.max(0, (helpRowWidth - 12) / 2);

  function languageChange(next: AppLanguage) {
    setLanguage(next);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function themeChange(next: MobileTheme) {
    if (!premium && ["arcade", "castle", "cyberpunk", "hologram", "space"].includes(next)) {
      showAlert(
        t("Tema Premium", "Premium theme"),
        t(
          "Este estilo faz parte do Pieceful Premium.",
          "This style is included with Pieceful Premium.",
        ),
      );
      return;
    }
    setTheme(next);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function startPremiumPurchase() {
    if (ageGroup !== "child") {
      void purchasePremium();
      return;
    }
    showAlert(
      t("Confirmação do responsável", "Parent or guardian confirmation"),
      t(
        "Entregue o aparelho a um responsável para continuar a compra pela Play Store.",
        "Hand the device to a parent or guardian to continue the purchase in Google Play.",
      ),
      [
        { text: t("Cancelar", "Cancel"), style: "cancel" },
        { text: t("Sou responsável", "I'm the guardian"), onPress: () => void purchasePremium() },
      ],
    );
  }

  function confirmAccountDeletion() {
    showAlert(
      t("Excluir conta e dados?", "Delete account and data?"),
      t(
        "Isso excluirá permanentemente seu perfil, quebra-cabeças sincronizados, fotos, amizades e conquistas. Essa ação não pode ser desfeita.",
        "This permanently deletes your profile, synced puzzles, photos, friendships, and achievements. This action cannot be undone.",
      ),
      [
        { text: t("Cancelar", "Cancel"), style: "cancel" },
        {
          text: t("Excluir definitivamente", "Delete permanently"),
          style: "destructive",
          onPress: () =>
            void deleteAccount()
              .then(() => {
                deleteLocalPuzzles();
                showAlert(
                  t("Conta excluída", "Account deleted"),
                  t("Seus dados da conta foram removidos.", "Your account data has been removed."),
                );
              })
              .catch(() =>
                showAlert(
                  t("Não foi possível excluir", "Unable to delete"),
                  t(
                    "Tente novamente ou fale com perazzolabs@gmail.com.",
                    "Try again or contact perazzolabs@gmail.com.",
                  ),
                ),
              ),
        },
      ],
    );
  }
  const visibleThemes =
    ageGroup === "child"
      ? mobileThemeCatalog.filter((item) =>
          ["candy", "jungle", "rainbow", "ocean", "castle", "storybook", "space"].includes(item.id),
        )
      : mobileThemeCatalog;
  const premiumPackage = offering?.availablePackages[0];

  return (
    <Screen>
      <AppHeader title={t("Configurações", "Settings")} showTitle back />

      <Section title={t("IDIOMA", "LANGUAGE")}>
        <View
          style={[
            styles.language,
            {
              backgroundColor: colors.panel,
              borderColor: `${colors.muted}40`,
              borderRadius: colors.radius,
            },
          ]}
        >
          {(["pt-BR", "en"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => languageChange(item)}
              style={[
                styles.languageOption,
                { borderRadius: Math.max(6, colors.radius - 5) },
                item === language
                  ? {
                      backgroundColor: colors.panelAlt,
                      borderColor: `${colors.accent}65`,
                      borderWidth: 1,
                    }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  { color: item === language ? colors.accent : colors.muted },
                ]}
              >
                {item === "pt-BR" ? "Português" : "English"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={t("GALERIA DE TEMAS", "THEME GALLERY")}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {visibleThemes.map((item) => {
            const preview = mobileThemes[item.id];
            const selected = item.id === theme;
            const locked =
              !premium && ["arcade", "castle", "cyberpunk", "hologram", "space"].includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => themeChange(item.id)}
                style={({ pressed }) => [styles.themePressable, pressed ? styles.pressed : null]}
              >
                <View
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: preview.panel,
                      borderColor: selected ? colors.accent : `${preview.muted}45`,
                      borderRadius: preview.radius,
                    },
                  ]}
                >
                  <LinearGradient colors={[...preview.gradient]} style={styles.themeStripe} />
                  <View
                    style={[
                      styles.themeIcon,
                      {
                        backgroundColor: preview.panelAlt,
                        borderRadius: Math.max(6, preview.radius - 7),
                      },
                    ]}
                  >
                    <Ionicons name={item.icon} size={28} color={preview.accent} />
                  </View>
                  <Text numberOfLines={1} style={[styles.themeName, { color: preview.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.themeDescription, { color: preview.muted }]}
                  >
                    {t(item.description[0], item.description[1])}
                  </Text>
                  {selected ? (
                    <View style={[styles.check, { backgroundColor: colors.accent }]}>
                      <Ionicons name="checkmark" size={15} color={colors.background} />
                    </View>
                  ) : locked ? (
                    <View style={[styles.check, { backgroundColor: preview.panelAlt }]}>
                      <Ionicons name="lock-closed" size={14} color={preview.muted} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="PIECEFUL PREMIUM">
        <LinearGradient
          colors={[`${colors.primary}32`, `${colors.accent}20`]}
          style={[
            styles.premiumCard,
            { borderColor: `${colors.primary}66`, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.premiumHeader}>
            <View style={[styles.premiumIcon, { backgroundColor: `${colors.primary}28` }]}>
              <Ionicons
                name={premium ? "checkmark-circle" : "diamond-outline"}
                size={28}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumTitle, { color: colors.text }]}>
                {premium
                  ? t("Premium ativo", "Premium active")
                  : t("Jogue sem interrupções", "Play without interruptions")}
              </Text>
              <Text style={[styles.premiumSubtitle, { color: colors.muted }]}>
                {premium
                  ? t("Obrigado por apoiar o Pieceful.", "Thanks for supporting Pieceful.")
                  : t(
                      "Sem anúncios, dicas livres e estilos exclusivos.",
                      "No ads, unlimited hints and exclusive styles.",
                    )}
              </Text>
            </View>
          </View>
          {!premium ? (
            <>
              <View style={styles.benefits}>
                <Benefit text={t("Remover todos os anúncios", "Remove all ads")} />
                <Benefit text={t("Dicas sem assistir vídeos", "Hints without watching videos")} />
                <Benefit text={t("Temas e recursos premium", "Premium themes and features")} />
              </View>
              <PrimaryButton
                icon="diamond-outline"
                disabled={!purchaseAvailable}
                onPress={startPremiumPurchase}
              >
                {purchaseAvailable
                  ? t(
                      `Assinar por ${premiumPackage?.product.priceString ?? ""}`,
                      `Subscribe for ${premiumPackage?.product.priceString ?? ""}`,
                    )
                  : t("Configure o plano na Play Store", "Configure the plan in Play Store")}
              </PrimaryButton>
              <SecondaryButton
                icon="refresh-outline"
                disabled={!purchaseAvailable}
                onPress={() => void restorePurchases()}
              >
                {t("Restaurar compra", "Restore purchase")}
              </SecondaryButton>
            </>
          ) : null}
          {ageGroup === "child" && !premium ? (
            <Text style={[styles.parentNote, { color: colors.muted }]}>
              {t(
                "Peça a um responsável para confirmar qualquer compra.",
                "Ask a parent or guardian to confirm any purchase.",
              )}
            </Text>
          ) : null}
          {monetizationError ? (
            <Text style={[styles.monetizationError, { color: colors.danger }]}>
              {monetizationError}
            </Text>
          ) : null}
        </LinearGradient>
      </Section>

      <Section title={t("FAIXA ETÁRIA", "AGE RANGE")}>
        <Pressable
          onPress={() =>
            showAlert(
              t("Alterar faixa etária?", "Change age range?"),
              t(
                "A experiência e a configuração de anúncios serão atualizadas.",
                "The experience and ad settings will be updated.",
              ),
              [
                { text: t("Cancelar", "Cancel"), style: "cancel" },
                { text: t("Alterar", "Change"), onPress: resetAgeGroup },
              ],
            )
          }
          style={[
            styles.ageCard,
            {
              backgroundColor: colors.panel,
              borderColor: `${colors.muted}38`,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.panelAlt }]}>
            <Ionicons name="people-outline" size={21} color={colors.accent} />
          </View>
          <View style={styles.ageCopy}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.ageTitle, { color: colors.text }]}>
              {ageGroup === "child"
                ? t("Até 12 anos", "12 or younger")
                : ageGroup === "teen"
                  ? t("13 a 17 anos", "13 to 17")
                  : t("18 anos ou mais", "18 or older")}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.ageDescription, { color: colors.muted }]}>
              {t("Alterar configuração", "Change setting")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </Section>

      <Section title={t("PREFERÊNCIAS", "PREFERENCES")}>
        <View
          style={[
            styles.group,
            {
              backgroundColor: colors.panel,
              borderColor: `${colors.muted}38`,
              borderRadius: colors.radius,
            },
          ]}
        >
          <SettingToggleRow
            icon="volume-high-outline"
            title={t("Som", "Sound")}
            value={preferences.sound}
            onChange={(value) => updatePreference("sound", value)}
          />
          <SettingToggleRow
            icon="phone-portrait-outline"
            title={t("Resposta tátil", "Haptics")}
            value={preferences.haptics}
            onChange={(value) => updatePreference("haptics", value)}
          />
          <SettingLinkRow
            icon="accessibility-outline"
            title={t("Acessibilidade", "Accessibility")}
            onPress={() => router.push("/settings/accessibility" as never)}
            last
          />
        </View>
      </Section>

      <Section title={t("AJUDA", "HELP")}>
        <View
          style={[
            styles.group,
            styles.tourGroup,
            {
              backgroundColor: colors.panel,
              borderColor: `${colors.muted}38`,
              borderRadius: colors.radius,
            },
          ]}
        >
          <SettingLinkRow
            icon="compass-outline"
            title={t("Refazer tour do aplicativo", "Replay app tour")}
            onPress={startTour}
            last
          />
        </View>
        <View style={[styles.helpRow, { width: helpRowWidth }]}>
          <HelpCard
            width={helpCardWidth}
            icon="game-controller-outline"
            title={t("Controles", "Controller Help")}
            subtitle="Xbox · PlayStation"
            onPress={() => router.push("/help/controller" as never)}
          />
          <HelpCard
            width={helpCardWidth}
            icon="hand-left-outline"
            title={t("Gestos touch", "Touch gestures")}
            subtitle={t("Zoom · mover · girar", "Zoom · pan · rotate")}
            onPress={() => router.push("/help/touch" as never)}
          />
        </View>
      </Section>

      <Pressable
        disabled={puzzles.length === 0}
        onPress={() =>
          showAlert(
            t("Excluir quebra-cabeças deste aparelho?", "Delete puzzles from this device?"),
            t(
              "Os quebra-cabeças e seus históricos de montagem locais serão removidos. Os dados sincronizados da sua conta não serão apagados.",
              "Local puzzles and their assembly histories will be removed. Synced account data will not be deleted.",
            ),
            [
              { text: t("Cancelar", "Cancel"), style: "cancel" },
              { text: t("Excluir", "Delete"), style: "destructive", onPress: deleteLocalPuzzles },
            ],
          )
        }
        style={[
          styles.danger,
          puzzles.length === 0 && styles.dangerDisabled,
          { borderColor: `${colors.danger}66`, borderRadius: Math.max(7, colors.radius) },
        ]}
      >
        <Text style={[styles.dangerText, { color: colors.danger }]}>
          {t("Excluir quebra-cabeças deste aparelho", "Delete puzzles from this device")}
        </Text>
        <Ionicons name="trash-outline" size={22} color={colors.danger} />
      </Pressable>

      {session ? (
        <Pressable
          disabled={accountBusy}
          onPress={confirmAccountDeletion}
          style={[
            styles.danger,
            accountBusy && styles.dangerDisabled,
            { borderColor: `${colors.danger}66`, borderRadius: Math.max(7, colors.radius) },
          ]}
        >
          <Text style={[styles.dangerText, { color: colors.danger }]}>
            {t("Excluir conta e dados da nuvem", "Delete account and cloud data")}
          </Text>
          <Ionicons name="person-remove-outline" size={22} color={colors.danger} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Benefit({ text }: { text: string }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={styles.benefit}>
      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
      <Text style={[styles.benefitText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function SettingToggleRow({
  icon,
  title,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={[styles.settingRow, { borderBottomColor: `${colors.muted}20` }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.panelAlt }]}>
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>
      <Text style={[styles.settingText, { color: colors.text }]}>{title}</Text>
      <View style={styles.switchSlot}>
        <Switch
          value={value}
          onValueChange={onChange}
          ios_backgroundColor={colors.panelAlt}
          trackColor={{ false: colors.panelAlt, true: `${colors.accent}bb` }}
          thumbColor={value ? colors.text : colors.muted}
          style={styles.switch}
        />
      </View>
    </View>
  );
}

function SettingLinkRow({
  icon,
  title,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <View
        style={[
          styles.settingRow,
          {
            borderBottomColor: `${colors.muted}20`,
            borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.panelAlt }]}>
          <Ionicons name={icon} size={21} color={colors.accent} />
        </View>
        <Text style={[styles.settingText, { color: colors.text }]}>{title}</Text>
        <View style={styles.switchSlot}>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  );
}

function HelpCard({
  icon,
  title,
  subtitle,
  onPress,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  width: number;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={{ width }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.helpPressable, pressed ? styles.pressed : null]}
      >
        <View
          style={[
            styles.help,
            {
              backgroundColor: colors.panel,
              borderColor: `${colors.muted}38`,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={[styles.helpIcon, { backgroundColor: colors.panelAlt }]}>
            <Ionicons name={icon} size={27} color={colors.primary} />
          </View>
          <Text style={[styles.helpText, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.helpSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", marginBottom: 30, width: "100%" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1.4, marginBottom: 13 },
  language: { flexDirection: "row", borderWidth: 1, padding: 4 },
  languageOption: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" },
  languageText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  themePressable: { width: 174, height: 150 },
  themeCard: {
    flex: 1,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  themeStripe: { position: "absolute", left: 0, right: 0, top: 0, height: 6 },
  themeIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  themeName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 },
  themeDescription: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3 },
  check: {
    position: "absolute",
    top: 14,
    right: 12,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  group: { borderWidth: 1, overflow: "hidden" },
  settingRow: {
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  switchSlot: { width: 62, minHeight: 48, alignItems: "flex-end", justifyContent: "center" },
  switch: { transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }] },
  tourGroup: { marginBottom: 12 },
  helpRow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "stretch", gap: 12 },
  helpPressable: { width: "100%", minWidth: 0 },
  help: {
    width: "100%",
    minHeight: 154,
    borderWidth: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 16,
  },
  helpIcon: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  helpText: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17 },
  helpSubtitle: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  danger: {
    minHeight: 64,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dangerText: { fontFamily: "Inter_700Bold", fontSize: 17 },
  dangerDisabled: { opacity: 0.38 },
  premiumCard: { borderWidth: 1, padding: 18, gap: 14, overflow: "hidden" },
  premiumHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  premiumIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 21 },
  premiumSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, marginTop: 3 },
  benefits: { gap: 9 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 9 },
  benefitText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  parentNote: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  monetizationError: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  ageCard: {
    minHeight: 82,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ageCopy: { flex: 1, minWidth: 0, justifyContent: "center" },
  ageTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 21 },
  ageDescription: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
});
