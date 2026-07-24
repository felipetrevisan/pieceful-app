import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";

export default function AccountScreen() {
  const { t, theme } = useApp();
  const { busy, configured, error, profile, session, signIn, signOut } = useSocial();
  const colors = mobileThemes[theme];

  return (
    <Screen>
      <AppHeader title={t("Sua conta", "Your account")} showTitle back />
      <LinearGradient colors={[`${colors.accent}26`, `${colors.primary}22`]} style={[styles.hero, { borderColor: `${colors.accent}45`, borderRadius: colors.radius }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name={session ? "cloud-done" : "cloud-outline"} size={34} color={colors.accent} /></View>
        <Text style={[styles.title, { color: colors.text }]}>{session ? t(`Olá, ${profile.displayName}`, `Hi, ${profile.displayName}`) : t("Leve seu progresso com você", "Take your progress with you")}</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>{session ? t("Quebra-cabeças, XP, amigos e conquistas são sincronizados com segurança.", "Puzzles, XP, friends and achievements are securely synced.") : t("Entre para sincronizar seus quebra-cabeças, conquistas e perfil entre dispositivos.", "Sign in to sync puzzles, achievements and your profile across devices.")}</Text>
      </LinearGradient>

      {!configured ? <View style={[styles.notice, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}45` }]}><Ionicons name="construct-outline" size={21} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.text }]}>{t("Configure as variáveis do Supabase no .env para ativar o login.", "Configure the Supabase variables in .env to enable sign-in.")}</Text></View> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {busy ? <ActivityIndicator color={colors.accent} size="large" /> : session ? (
        <View style={styles.actions}>
          <PrimaryButton icon="person-outline" onPress={() => router.push("/(tabs)/profile" as never)}>{t("Abrir meu perfil", "Open my profile")}</PrimaryButton>
          <SecondaryButton icon="log-out-outline" onPress={() => void signOut()}>{t("Sair desta conta", "Sign out")}</SecondaryButton>
        </View>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton icon="logo-google" disabled={!configured} onPress={() => void signIn("google")}>{t("Continuar com Google", "Continue with Google")}</PrimaryButton>
          <SecondaryButton icon="logo-microsoft" disabled={!configured} onPress={() => void signIn("azure")}>{t("Continuar com Microsoft", "Continue with Microsoft")}</SecondaryButton>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 18 },
  heroIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 28, textAlign: "center" },
  copy: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 9 },
  notice: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  noticeText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 19 },
  error: { fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "center", marginBottom: 12 },
  actions: { gap: 12 },
});
