import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedAuroraBackground } from "@/components/animated-aurora-background";
import { useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";

export function AuthGate() {
  const { t } = useApp();
  const { busy, configured, enterDevAccess, error, signIn } = useSocial();

  return (
    <SafeAreaView style={styles.screen}>
      <AnimatedAuroraBackground strongOverlay />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.brand}>
          <View style={styles.logoHalo}>
            <Image
              source={require("../../assets/images/pieceful-logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.eyebrow}>
            {t("SUA JORNADA COMEÇA AQUI", "YOUR JOURNEY STARTS HERE")}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>
            {t("Entre no Pieceful", "Welcome to Pieceful")}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.subtitle}>
            {t(
              "Salve seus quebra-cabeças, conquistas e XP e continue de qualquer dispositivo.",
              "Save your puzzles, achievements and XP, and continue from any device.",
            )}
          </Text>
        </View>

        <View style={styles.panelShell}>
          <View style={styles.panel}>
            <View style={styles.panelContent}>
              {busy ? (
                <View style={styles.loading}>
                  <ActivityIndicator color="#63edf2" size="large" />
                  <Text maxFontSizeMultiplier={1.2} style={styles.loadingText}>
                    {t("Conectando sua conta…", "Connecting your account…")}
                  </Text>
                </View>
              ) : (
                <View style={styles.providerStack}>
                  <ProviderButton
                    provider="google"
                    label={t("Continuar com Google", "Continue with Google")}
                    onPress={() => void signIn("google")}
                    disabled={!configured}
                  />
                  <ProviderButton
                    provider="microsoft"
                    label={t("Continuar com Microsoft", "Continue with Microsoft")}
                    onPress={() => void signIn("azure")}
                    disabled={!configured}
                  />
                </View>
              )}

              {__DEV__ && !busy ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Entrar no modo de teste", "Enter test mode")}
                  onPress={() => void enterDevAccess()}
                  android_ripple={{ color: "rgba(99,237,242,.14)" }}
                  style={styles.devButton}
                >
                  <Ionicons name="flask-outline" size={21} color="#63edf2" />
                  <View style={styles.devCopy}>
                    <Text maxFontSizeMultiplier={1.15} style={styles.devLabel}>
                      {t("Entrar no modo de teste", "Enter test mode")}
                    </Text>
                    <Text maxFontSizeMultiplier={1.15} style={styles.devCaption}>
                      {t("Acesso local sem login", "Local access without sign-in")}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={19} color="#aeb9d8" />
                </Pressable>
              ) : null}

              {!configured ? (
                <Text maxFontSizeMultiplier={1.2} style={styles.configurationError}>
                  {t(
                    "Configure as credenciais do Supabase para ativar o login.",
                    "Configure the Supabase credentials to enable sign-in.",
                  )}
                </Text>
              ) : null}
              {error ? (
                <Text maxFontSizeMultiplier={1.2} style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <View style={styles.security}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#aeb9d8" />
                <Text maxFontSizeMultiplier={1.2} style={styles.securityText}>
                  {t(
                    "Login seguro. Sua senha nunca é compartilhada com o Pieceful.",
                    "Secure sign-in. Your password is never shared with Pieceful.",
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProviderButton({
  disabled,
  label,
  onPress,
  provider,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  provider: "google" | "microsoft";
}) {
  const google = provider === "google";
  const gradientColors: [string, string] = google ? ["#ffffff", "#edf3ff"] : ["#3478e5", "#1854bd"];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        google ? styles.googleShadow : styles.microsoftShadow,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.providerSurface, google ? styles.googleSurface : styles.microsoftSurface]}
      >
        <View style={styles.providerRow}>
          <View style={styles.providerIcon}>
            {google ? <Ionicons name="logo-google" size={25} color="#4285f4" /> : <MicrosoftLogo />}
          </View>
          <Text
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[styles.providerLabel, google ? styles.googleLabel : styles.microsoftLabel]}
          >
            {label}
          </Text>
          <View style={styles.providerBalance} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function MicrosoftLogo() {
  return (
    <View style={styles.microsoftLogo}>
      <View style={[styles.microsoftSquare, { backgroundColor: "#f25022" }]} />
      <View style={[styles.microsoftSquare, { backgroundColor: "#7fba00" }]} />
      <View style={[styles.microsoftSquare, { backgroundColor: "#00a4ef" }]} />
      <View style={[styles.microsoftSquare, { backgroundColor: "#ffb900" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#05091a" },
  content: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 28,
  },
  brand: { alignItems: "center", paddingHorizontal: 10, marginBottom: 28 },
  logoHalo: {
    width: 126,
    height: 126,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: "rgba(99,237,242,.3)",
    backgroundColor: "rgba(8,15,38,.34)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#63edf2",
    shadowOpacity: 0.24,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
  },
  logo: { width: 108, height: 108 },
  eyebrow: {
    color: "#63edf2",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
    marginTop: 20,
  },
  title: {
    color: "#f5f6ff",
    fontFamily: "BricolageGrotesque_800ExtraBold",
    fontSize: 33,
    letterSpacing: -0.8,
    textAlign: "center",
    marginTop: 9,
  },
  subtitle: {
    color: "rgba(225,231,255,.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 350,
  },
  panelShell: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(99,237,242,.28)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 10,
  },
  panel: { width: "100%", backgroundColor: "rgba(7,13,34,.78)" },
  panelContent: { width: "100%", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 },
  providerStack: { width: "100%", gap: 13 },
  devButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(99,237,242,.32)",
    backgroundColor: "rgba(99,237,242,.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  devCopy: { flex: 1, gap: 2 },
  devLabel: { color: "#f5f6ff", fontFamily: "Inter_700Bold", fontSize: 14 },
  devCaption: { color: "#aeb9d8", fontFamily: "Inter_400Regular", fontSize: 11 },
  providerButton: {
    width: "100%",
    height: 62,
    borderRadius: 19,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  providerSurface: { flex: 1, width: "100%", borderRadius: 19, borderWidth: 1, overflow: "hidden" },
  providerRow: {
    width: "100%",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
  },
  googleSurface: { borderColor: "rgba(255,255,255,.96)" },
  microsoftSurface: { borderColor: "rgba(130,181,255,.72)" },
  googleShadow: { shadowColor: "#b8d0ff" },
  microsoftShadow: { shadowColor: "#1e55af" },
  providerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  providerBalance: { width: 42, height: 42, flexShrink: 0 },
  microsoftLogo: { width: 22, height: 22, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  microsoftSquare: { width: 10, height: 10 },
  providerLabel: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  googleLabel: { color: "#111a31" },
  microsoftLabel: { color: "#ffffff" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.68 },
  loading: { minHeight: 131, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "rgba(225,231,255,.72)", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  configurationError: {
    color: "#ffcc7a",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 13,
    paddingHorizontal: 8,
  },
  error: {
    color: "#ff9ba7",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 13,
    paddingHorizontal: 8,
  },
  security: {
    minHeight: 38,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 15,
    paddingTop: 13,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(174,185,216,.2)",
  },
  securityText: {
    color: "#aeb9d8",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "left",
    flexShrink: 1,
  },
});
