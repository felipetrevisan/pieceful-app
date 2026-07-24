import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AgeGroup } from "@/state/app-provider";
import { useApp } from "@/state/app-provider";

const choices: { id: AgeGroup; icon: keyof typeof Ionicons.glyphMap; pt: string; en: string }[] = [
  { id: "child", icon: "happy-outline", pt: "Até 12 anos", en: "12 or younger" },
  { id: "teen", icon: "game-controller-outline", pt: "13 a 17 anos", en: "13 to 17" },
  { id: "adult", icon: "person-outline", pt: "18 anos ou mais", en: "18 or older" },
];

export function AgeGate() {
  const { setAgeGroup, t } = useApp();
  return <SafeAreaView style={styles.screen}>
    <Image source={require("../../assets/images/splash-background.png")} style={StyleSheet.absoluteFill} contentFit="cover" />
    <LinearGradient colors={["rgba(7,12,38,.32)", "rgba(8,10,29,.94)"]} style={StyleSheet.absoluteFill} />
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Image
          accessibilityIgnoresInvertColors
          source={require("../../assets/images/pieceful-logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text maxFontSizeMultiplier={1.2} style={styles.kicker}>{t("ANTES DE COMEÇAR", "BEFORE YOU START")}</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>{t("Qual é a sua faixa etária?", "What is your age range?")}</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.description}>{t("Escolha uma opção para configurarmos a experiência corretamente.", "Choose one option so we can configure the experience correctly.")}</Text>
        <View style={styles.choices}>
          {choices.map((choice) => <View key={choice.id} style={styles.choice}>
            <Pressable
              accessibilityRole="button"
              android_ripple={{ color: "rgba(103,237,243,.12)" }}
              onPress={() => setAgeGroup(choice.id)}
              style={styles.choiceTouch}
            >
              <View style={styles.choiceIcon}><Ionicons name={choice.icon} size={27} color="#67edf3" /></View>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={styles.choiceText}>{t(choice.pt, choice.en)}</Text>
              <Ionicons name="chevron-forward" size={22} color="#aeb9d8" />
            </Pressable>
          </View>)}
        </View>
        <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={18} color="#aeb9d8" /><Text maxFontSizeMultiplier={1.2} style={styles.privacyText}>{t("Guardamos apenas a faixa escolhida neste aparelho. Não pedimos sua data de nascimento.", "We only store the selected range on this device. We don't ask for your birth date.")}</Text></View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#05091a" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 28 },
  content: { alignSelf: "center", width: "100%", maxWidth: 520 },
  logo: { alignSelf: "center", width: 106, height: 106, marginBottom: 20 },
  kicker: { color: "#67edf3", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2 },
  title: { color: "#f5f6ff", fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 38, lineHeight: 42, marginTop: 9 },
  description: { color: "#b8c1dc", fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 23 },
  choices: { alignSelf: "stretch", width: "100%", gap: 12 },
  choice: { alignSelf: "stretch", width: "100%", minHeight: 76, borderRadius: 23, borderWidth: 1, borderColor: "rgba(103,237,243,.28)", backgroundColor: "rgba(20,29,58,.86)", overflow: "hidden" },
  choiceTouch: { flex: 1, width: "100%", minHeight: 74, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 15, paddingVertical: 12 },
  choiceIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(103,237,243,.1)" },
  choiceText: { flex: 1, minWidth: 0, color: "#f5f6ff", fontFamily: "Inter_700Bold", fontSize: 17 },
  privacy: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 22, paddingHorizontal: 4 },
  privacyText: { flex: 1, color: "#aeb9d8", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
});
