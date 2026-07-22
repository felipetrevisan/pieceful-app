import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from "react-native";
import { AppHeader, Screen } from "@/components/pieceful-ui";
import { mobileThemeCatalog, mobileThemes } from "@/constants/pieceful-theme";
import { type AppLanguage, type MobileTheme, useApp } from "@/state/app-provider";

export default function SettingsScreen() {
  const { language, preferences, setLanguage, setTheme, startTour, t, theme, updatePreference } = useApp();
  const colors = mobileThemes[theme];
  const { width: screenWidth } = useWindowDimensions();
  const helpRowWidth = Math.max(0, screenWidth - 40);
  const helpCardWidth = Math.max(0, (helpRowWidth - 12) / 2);

  function languageChange(next: AppLanguage) {
    setLanguage(next);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function themeChange(next: MobileTheme) {
    setTheme(next);
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  return (
    <Screen>
      <AppHeader title={t("Configurações", "Settings")} showTitle back />

      <Section title={t("IDIOMA", "LANGUAGE")}>
        <View style={[styles.language, { backgroundColor: colors.panel, borderColor: `${colors.muted}40`, borderRadius: colors.radius }]}>
          {(["pt-BR", "en"] as const).map((item) => (
            <Pressable key={item} onPress={() => languageChange(item)} style={[styles.languageOption, { borderRadius: Math.max(6, colors.radius - 5) }, item === language ? { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}65`, borderWidth: 1 } : null]}>
              <Text style={[styles.languageText, { color: item === language ? colors.accent : colors.muted }]}>{item === "pt-BR" ? "Português" : "English"}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={t("GALERIA DE TEMAS", "THEME GALLERY")}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {mobileThemeCatalog.map((item) => {
            const preview = mobileThemes[item.id];
            const selected = item.id === theme;
            return (
              <Pressable key={item.id} onPress={() => themeChange(item.id)} style={({ pressed }) => [styles.themePressable, pressed ? styles.pressed : null]}>
                <View style={[styles.themeCard, { backgroundColor: preview.panel, borderColor: selected ? colors.accent : `${preview.muted}45`, borderRadius: preview.radius }]}>
                  <LinearGradient colors={[...preview.gradient]} style={styles.themeStripe} />
                  <View style={[styles.themeIcon, { backgroundColor: preview.panelAlt, borderRadius: Math.max(6, preview.radius - 7) }]}><Ionicons name={item.icon} size={28} color={preview.accent} /></View>
                  <Text numberOfLines={1} style={[styles.themeName, { color: preview.text }]}>{item.name}</Text>
                  <Text numberOfLines={1} style={[styles.themeDescription, { color: preview.muted }]}>{t(item.description[0], item.description[1])}</Text>
                  {selected ? <View style={[styles.check, { backgroundColor: colors.accent }]}><Ionicons name="checkmark" size={15} color={colors.background} /></View> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section title={t("PREFERÊNCIAS", "PREFERENCES")}>
        <View style={[styles.group, { backgroundColor: colors.panel, borderColor: `${colors.muted}38`, borderRadius: colors.radius }]}>
          <SettingToggleRow icon="volume-high-outline" title={t("Som", "Sound")} value={preferences.sound} onChange={(value) => updatePreference("sound", value)} />
          <SettingToggleRow icon="phone-portrait-outline" title={t("Resposta tátil", "Haptics")} value={preferences.haptics} onChange={(value) => updatePreference("haptics", value)} />
          <SettingLinkRow icon="accessibility-outline" title={t("Acessibilidade", "Accessibility")} onPress={() => router.push("/settings/accessibility" as never)} last />
        </View>
      </Section>

      <Section title={t("AJUDA", "HELP")}>
        <View style={[styles.group, styles.tourGroup, { backgroundColor: colors.panel, borderColor: `${colors.muted}38`, borderRadius: colors.radius }]}>
          <SettingLinkRow icon="compass-outline" title={t("Refazer tour do aplicativo", "Replay app tour")} onPress={startTour} last />
        </View>
        <View style={[styles.helpRow, { width: helpRowWidth }]}>
          <HelpCard width={helpCardWidth} icon="game-controller-outline" title={t("Controles", "Controller Help")} subtitle="Xbox · PlayStation" onPress={() => router.push("/help/controller" as never)} />
          <HelpCard width={helpCardWidth} icon="hand-left-outline" title={t("Gestos touch", "Touch gestures")} subtitle={t("Zoom · mover · girar", "Zoom · pan · rotate")} onPress={() => router.push("/help/touch" as never)} />
        </View>
      </Section>

      <Pressable onPress={() => Alert.alert(t("Dados locais", "Local data"), t("A conta online ainda não está ativa. Seus puzzles continuam armazenados neste aparelho.", "Online accounts are not active yet. Your puzzles remain stored on this device."))} style={[styles.danger, { borderColor: `${colors.danger}66`, borderRadius: Math.max(7, colors.radius) }]}>
        <Text style={[styles.dangerText, { color: colors.danger }]}>{t("Excluir dados locais", "Delete local data")}</Text><Ionicons name="trash-outline" size={22} color={colors.danger} />
      </Pressable>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.accent }]}>{title}</Text>{children}</View>;
}

function SettingToggleRow({ icon, title, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: boolean; onChange: (value: boolean) => void }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  return <View style={[styles.settingRow, { borderBottomColor: `${colors.muted}20` }]}><View style={[styles.rowIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name={icon} size={21} color={colors.accent} /></View><Text style={[styles.settingText, { color: colors.text }]}>{title}</Text><View style={styles.switchSlot}><Switch value={value} onValueChange={onChange} ios_backgroundColor={colors.panelAlt} trackColor={{ false: colors.panelAlt, true: `${colors.accent}bb` }} thumbColor={value ? colors.text : colors.muted} style={styles.switch} /></View></View>;
}

function SettingLinkRow({ icon, title, onPress, last = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void; last?: boolean }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  return <Pressable onPress={onPress} style={({ pressed }) => pressed ? styles.pressed : null}><View style={[styles.settingRow, { borderBottomColor: `${colors.muted}20`, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}><View style={[styles.rowIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name={icon} size={21} color={colors.accent} /></View><Text style={[styles.settingText, { color: colors.text }]}>{title}</Text><View style={styles.switchSlot}><Ionicons name="chevron-forward" size={20} color={colors.muted} /></View></View></Pressable>;
}

function HelpCard({ icon, title, subtitle, onPress, width }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; width: number }) {
  const { theme } = useApp(); const colors = mobileThemes[theme];
  return <View style={{ width }}><Pressable onPress={onPress} style={({ pressed }) => [styles.helpPressable, pressed ? styles.pressed : null]}><View style={[styles.help, { backgroundColor: colors.panel, borderColor: `${colors.muted}38`, borderRadius: colors.radius }]}><View style={[styles.helpIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name={icon} size={27} color={colors.primary} /></View><Text style={[styles.helpText, { color: colors.text }]}>{title}</Text><Text style={[styles.helpSubtitle, { color: colors.muted }]}>{subtitle}</Text></View></Pressable></View>;
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", marginBottom: 30, width: "100%" }, sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1.4, marginBottom: 13 },
  language: { flexDirection: "row", borderWidth: 1, padding: 4 }, languageOption: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" }, languageText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  themePressable: { width: 174, height: 150 }, themeCard: { flex: 1, borderWidth: 1.5, padding: 14, justifyContent: "flex-end", overflow: "hidden" }, themeStripe: { position: "absolute", left: 0, right: 0, top: 0, height: 6 }, themeIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginBottom: 12 }, themeName: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 }, themeDescription: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3 }, check: { position: "absolute", top: 14, right: 12, width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  group: { borderWidth: 1, overflow: "hidden" }, settingRow: { minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 }, rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, settingText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16 }, switchSlot: { width: 62, minHeight: 48, alignItems: "flex-end", justifyContent: "center" }, switch: { transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }] },
  tourGroup: { marginBottom: 12 }, helpRow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "stretch", gap: 12 }, helpPressable: { width: "100%", minWidth: 0 }, help: { width: "100%", minHeight: 154, borderWidth: 1, alignItems: "flex-start", justifyContent: "center", padding: 16 }, helpIcon: { width: 47, height: 47, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 14 }, helpText: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17 }, helpSubtitle: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  danger: { minHeight: 64, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }, dangerText: { fontFamily: "Inter_700Bold", fontSize: 17 },
});
