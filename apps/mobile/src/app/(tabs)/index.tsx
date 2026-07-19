import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ActionButton, BrandHeader, Card, MutedText, PrimaryButton, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function HomeScreen() {
  const { puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const recent = puzzles.slice(0, 5);
  return (
    <Screen>
      <BrandHeader
        eyebrow="PIECEFUL"
        title={t("Suas memórias, peça por peça.", "Your memories, piece by piece.")}
        description={t(
          "Crie quebra-cabeças únicos e monte no seu ritmo, onde estiver.",
          "Create unique puzzles and play at your own pace, wherever you are.",
        )}
      />

      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="mb-7 overflow-hidden rounded-[30px] p-6"
      >
        <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15" />
        <View className="absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-[#071126]/15" />
        <View className="mb-10 h-14 w-14 items-center justify-center rounded-2xl bg-[#071126]/20">
          <Ionicons name="extension-puzzle" size={31} color="#ffffff" />
        </View>
        <Text className="max-w-[280px] text-3xl font-black leading-9 text-[#17102d]">
          {t("Transforme qualquer foto em um desafio.", "Turn any photo into a challenge.")}
        </Text>
        <Text className="mb-5 mt-2 text-sm font-semibold leading-5 text-[#251443]/75">
          {t("Escolha a dificuldade, rotação, dicas e comece.", "Choose difficulty, rotation, hints and start playing.")}
        </Text>
        <ActionButton variant="secondary" icon="sparkles" onPress={() => router.push("/(tabs)/create")}>
          {t("Criar novo puzzle", "Create new puzzle")}
        </ActionButton>
      </LinearGradient>

      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-xl font-black" style={{ color: colors.text }}>
            {t("Continue montando", "Continue playing")}
          </Text>
          <MutedText>{t("Seus últimos desafios", "Your latest challenges")}</MutedText>
        </View>
        {puzzles.length > 0 ? (
          <Pressable onPress={() => router.push("/(tabs)/puzzles")}>
            <Text className="font-bold" style={{ color: colors.accent }}>{t("Ver todos", "See all")}</Text>
          </Pressable>
        ) : null}
      </View>

      {recent.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mb-7" contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {recent.map((puzzle) => {
            const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
            const progress = Math.round((placed / puzzle.session.pieces.length) * 100);
            return (
              <Pressable key={puzzle.id} className="w-56 overflow-hidden rounded-3xl border active:scale-[0.98]" style={{ borderColor: `${colors.accent}28`, backgroundColor: colors.panel }} onPress={() => router.push(`/puzzle/${puzzle.id}`)}>
                <Image source={{ uri: puzzle.imageUri }} style={{ width: "100%", height: 128 }} contentFit="cover" />
                <View className="gap-2 p-4">
                  <Text numberOfLines={1} className="text-base font-black" style={{ color: colors.text }}>{puzzle.name}</Text>
                  <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.panelAlt }}>
                    <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: colors.accent }} />
                  </View>
                  <Text className="text-xs font-bold" style={{ color: colors.muted }}>{progress}% {t("concluído", "completed")}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Card className="mb-7 items-center gap-3 py-8">
          <Ionicons name="images-outline" size={34} color={colors.accent} />
          <Text className="text-center text-lg font-black" style={{ color: colors.text }}>{t("Sua coleção começa aqui", "Your collection starts here")}</Text>
          <MutedText className="text-center">{t("Crie seu primeiro quebra-cabeça com uma foto especial.", "Create your first puzzle from a special photo.")}</MutedText>
          <PrimaryButton className="mt-2 w-full" onPress={() => router.push("/(tabs)/create")}>{t("Escolher foto", "Choose photo")}</PrimaryButton>
        </Card>
      )}

      <View className="flex-row gap-3">
        <Card className="flex-1 gap-2">
          <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
          <Text className="font-black" style={{ color: colors.text }}>{t("Feito para toque", "Made for touch")}</Text>
          <MutedText>{t("Gestos naturais e feedback tátil.", "Natural gestures and haptic feedback.")}</MutedText>
        </Card>
        <Card className="flex-1 gap-2">
          <Ionicons name="cloud-offline-outline" size={25} color={colors.accent} />
          <Text className="font-black" style={{ color: colors.text }}>{t("Offline", "Offline")}</Text>
          <MutedText>{t("Suas fotos ficam no aparelho.", "Your photos stay on your device.")}</MutedText>
        </Card>
      </View>
    </Screen>
  );
}
