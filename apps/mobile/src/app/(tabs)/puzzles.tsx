import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { BrandHeader, Card, MutedText, PrimaryButton, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function PuzzlesScreen() {
  const { deletePuzzle, puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      t("Excluir quebra-cabeça?", "Delete puzzle?"),
      t(`“${name}” e todo o progresso serão apagados.`, `“${name}” and all progress will be deleted.`),
      [
        { text: t("Cancelar", "Cancel"), style: "cancel" },
        { text: t("Excluir", "Delete"), style: "destructive", onPress: () => deletePuzzle(id) },
      ],
    );
  }

  return (
    <Screen>
      <BrandHeader
        eyebrow={t("SUA COLEÇÃO", "YOUR COLLECTION")}
        title={t("Meus puzzles", "My puzzles")}
        description={t("Continue de onde parou ou revisite uma memória finalizada.", "Continue where you left off or revisit a completed memory.")}
      />

      {puzzles.length === 0 ? (
        <Card className="items-center gap-3 py-10">
          <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panelAlt }}>
            <Ionicons name="albums-outline" size={30} color={colors.accent} />
          </View>
          <Text className="text-center text-xl font-black" style={{ color: colors.text }}>{t("Sua estante está vazia", "Your shelf is empty")}</Text>
          <MutedText className="text-center">{t("Crie seu primeiro desafio e ele aparecerá aqui.", "Create your first challenge and it will appear here.")}</MutedText>
          <PrimaryButton className="mt-3 w-full" onPress={() => router.push("/(tabs)/create")}>{t("Criar agora", "Create now")}</PrimaryButton>
        </Card>
      ) : (
        <View className="gap-4">
          {puzzles.map((puzzle) => {
            const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
            const progress = Math.round((placed / puzzle.session.pieces.length) * 100);
            const completed = progress === 100 || puzzle.session.completedAt !== null;
            return (
              <Card key={puzzle.id} className="overflow-hidden p-0">
                <Image source={{ uri: puzzle.imageUri }} style={{ width: "100%", height: 190 }} contentFit="cover" />
                <View className="gap-3 p-5">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-xs font-black tracking-[2px]" style={{ color: completed ? colors.accent : colors.primary }}>{completed ? t("FINALIZADO", "COMPLETED") : `${puzzle.configuration.totalPieces} ${t("PEÇAS", "PIECES")}`}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xl font-black" style={{ color: colors.text }}>{puzzle.name}</Text>
                    </View>
                    <Pressable className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panelAlt }} onPress={() => confirmDelete(puzzle.id, puzzle.name)}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.panelAlt }}><View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: colors.accent }} /></View>
                  <View className="flex-row items-center justify-between">
                    <MutedText>{progress}% {t("concluído", "completed")}</MutedText>
                    <MutedText>{new Date(puzzle.updatedAt).toLocaleDateString()}</MutedText>
                  </View>
                  <PrimaryButton onPress={() => router.push(`/puzzle/${puzzle.id}`)}>{completed ? t("Ver resultado", "View result") : t("Continuar montagem", "Continue puzzle")}</PrimaryButton>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
