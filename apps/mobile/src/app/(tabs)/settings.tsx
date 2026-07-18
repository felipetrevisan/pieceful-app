import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
import { BrandHeader, Card, MutedText, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { type AppLanguage, type MobileTheme, useApp } from "@/state/app-provider";

const themeOptions: { id: MobileTheme; icon: string; name: string; subtitle: [string, string] }[] = [
  { id: "cosmic", icon: "✦", name: "Cosmic Night", subtitle: ["Profundo e imersivo", "Deep and immersive"] },
  { id: "candy", icon: "🍭", name: "Candy Pop", subtitle: ["Colorido e divertido", "Colorful and playful"] },
  { id: "cyberpunk", icon: "◈", name: "Cyberpunk", subtitle: ["Neon e futurista", "Neon and futuristic"] },
];

export default function SettingsScreen() {
  const { language, setLanguage, setTheme, t, theme } = useApp();
  const colors = mobileThemes[theme];

  function chooseLanguage(next: AppLanguage) {
    setLanguage(next);
    void Haptics.selectionAsync();
  }

  function chooseTheme(next: MobileTheme) {
    setTheme(next);
    void Haptics.selectionAsync();
  }

  return (
    <Screen>
      <BrandHeader
        eyebrow={t("SEU JEITO DE JOGAR", "PLAY YOUR WAY")}
        title={t("Configurações", "Settings")}
        description={t("Personalize o aplicativo e deixe tudo com a sua cara.", "Customize the app and make it feel like yours.")}
      />

      <Card className="mb-4 gap-4">
        <View className="flex-row items-center gap-3">
          <Ionicons name="language" size={23} color={colors.accent} />
          <View><Text className="text-lg font-black" style={{ color: colors.text }}>{t("Idioma", "Language")}</Text><MutedText>{t("Aplicado em todo o aplicativo", "Applied throughout the app")}</MutedText></View>
        </View>
        <View className="flex-row gap-3">
          <LanguageButton flag="🇧🇷" title="Português" selected={language === "pt-BR"} onPress={() => chooseLanguage("pt-BR")} />
          <LanguageButton flag="🇺🇸" title="English" selected={language === "en"} onPress={() => chooseLanguage("en")} />
        </View>
      </Card>

      <Card className="mb-4 gap-4">
        <View className="flex-row items-center gap-3">
          <Ionicons name="color-palette-outline" size={23} color={colors.accent} />
          <View><Text className="text-lg font-black" style={{ color: colors.text }}>{t("Temas", "Themes")}</Text><MutedText>{t("Uma mudança completa de atmosfera", "A complete change of atmosphere")}</MutedText></View>
        </View>
        {themeOptions.map((option) => {
          const selected = theme === option.id;
          const preview = mobileThemes[option.id];
          return (
            <Pressable key={option.id} className="min-h-[84px] flex-row items-center gap-4 rounded-2xl border p-3 active:scale-[0.99]" style={{ borderColor: selected ? colors.accent : `${colors.accent}20`, backgroundColor: selected ? `${colors.accent}12` : colors.panelAlt }} onPress={() => chooseTheme(option.id)}>
              <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: preview.background, borderColor: preview.accent, borderWidth: 1 }}><Text className="text-2xl">{option.icon}</Text></View>
              <View className="flex-1"><Text className="text-base font-black" style={{ color: colors.text }}>{option.name}</Text><MutedText>{option.subtitle[language === "en" ? 1 : 0]}</MutedText></View>
              <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={24} color={selected ? colors.accent : colors.muted} />
            </Pressable>
          );
        })}
      </Card>

      <Card className="gap-4">
        <View className="flex-row items-center gap-3"><Ionicons name="shield-checkmark-outline" size={23} color={colors.accent} /><View><Text className="text-lg font-black" style={{ color: colors.text }}>{t("Privacidade", "Privacy")}</Text><MutedText>{t("Projetado para funcionar localmente", "Designed to work locally")}</MutedText></View></View>
        <View className="rounded-2xl p-4" style={{ backgroundColor: colors.panelAlt }}>
          <Text className="font-bold leading-6" style={{ color: colors.text }}>{t("As imagens e o progresso ficam armazenados no aparelho. Você mantém o controle das suas memórias.", "Images and progress are stored on your device. You stay in control of your memories.")}</Text>
        </View>
      </Card>
    </Screen>
  );
}

function LanguageButton({ flag, title, selected, onPress }: { flag: string; title: string; selected: boolean; onPress: () => void }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <Pressable className="min-h-[92px] flex-1 items-center justify-center gap-2 rounded-2xl border active:scale-[0.98]" style={{ borderColor: selected ? colors.accent : `${colors.accent}20`, backgroundColor: selected ? `${colors.accent}16` : colors.panelAlt }} onPress={onPress}>
      <Text className="text-3xl">{flag}</Text><Text className="font-black" style={{ color: colors.text }}>{title}</Text>
    </Pressable>
  );
}
