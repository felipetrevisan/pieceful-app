import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
    <View style={styles.content}>
      <View style={styles.symbol}><Ionicons name="extension-puzzle" size={38} color="#071126" /></View>
      <Text style={styles.kicker}>{t("ANTES DE COMEÇAR", "BEFORE YOU START")}</Text>
      <Text style={styles.title}>{t("Qual é a sua faixa etária?", "What is your age range?")}</Text>
      <Text style={styles.description}>{t("Escolha uma opção para configurarmos a experiência corretamente.", "Choose one option so we can configure the experience correctly.")}</Text>
      <View style={styles.choices}>
        {choices.map((choice) => <Pressable key={choice.id} accessibilityRole="button" onPress={() => setAgeGroup(choice.id)} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
          <View style={styles.choiceIcon}><Ionicons name={choice.icon} size={27} color="#67edf3" /></View>
          <Text style={styles.choiceText}>{t(choice.pt, choice.en)}</Text>
          <Ionicons name="chevron-forward" size={22} color="#aeb9d8" />
        </Pressable>)}
      </View>
      <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={18} color="#aeb9d8" /><Text style={styles.privacyText}>{t("Guardamos apenas a faixa escolhida neste aparelho. Não pedimos sua data de nascimento.", "We only store the selected range on this device. We don't ask for your birth date.")}</Text></View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#05091a" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 28 },
  symbol: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#67edf3", shadowColor: "#67edf3", shadowOpacity: .35, shadowRadius: 22, elevation: 8 },
  kicker: { color: "#67edf3", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2, marginTop: 25 },
  title: { color: "#f5f6ff", fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 38, lineHeight: 42, marginTop: 9 },
  description: { color: "#b8c1dc", fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 23 },
  choices: { gap: 12 },
  choice: { minHeight: 76, borderRadius: 23, borderWidth: 1, borderColor: "rgba(103,237,243,.28)", backgroundColor: "rgba(20,29,58,.86)", flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 15 },
  choiceIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(103,237,243,.1)" },
  choiceText: { flex: 1, color: "#f5f6ff", fontFamily: "Inter_700Bold", fontSize: 17 },
  pressed: { opacity: .72, transform: [{ scale: .985 }] },
  privacy: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 22, paddingHorizontal: 4 },
  privacyText: { flex: 1, color: "#aeb9d8", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
});
