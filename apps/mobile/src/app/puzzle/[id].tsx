import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativePuzzleBoard } from "@/components/native-puzzle-board";
import { PrimaryButton, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function PuzzleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { puzzles, t, theme, updatePuzzleCamera, updatePuzzlePieces } = useApp();
  const colors = mobileThemes[theme];
  const puzzle = puzzles.find((item) => item.id === id);
  const [pieces, setPieces] = useState<PuzzlePiece[]>(puzzle?.session.pieces ?? []);
  const [showReference, setShowReference] = useState(false);

  const placed = useMemo(() => pieces.filter((piece) => piece.isPlaced).length, [pieces]);
  const progress = pieces.length ? Math.round((placed / pieces.length) * 100) : 0;

  function savePieces(next: PuzzlePiece[]) {
    setPieces(next);
    updatePuzzlePieces(id, next);
    if (next.length > 0 && next.every((piece) => piece.isPlaced)) {
      setTimeout(() => {
        Alert.alert(
          t("Memória reconstruída!", "Memory reconstructed!"),
          t("Você completou este quebra-cabeça.", "You completed this puzzle."),
          [{ text: t("Ver coleção", "View collection"), onPress: () => router.replace("/(tabs)/puzzles") }],
        );
      }, 350);
    }
  }

  function useHint() {
    const candidate = pieces.find((piece) => !piece.isPlaced);
    if (!candidate) return;
    savePieces(
      pieces.map((piece) =>
        piece.id === candidate.id
          ? { ...piece, isPlaced: true, currentPosition: { ...piece.correctPosition } }
          : piece,
      ),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (!puzzle) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 px-6" style={{ backgroundColor: colors.background }}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.accent} />
        <Text className="text-center text-xl font-black" style={{ color: colors.text }}>{t("Quebra-cabeça não encontrado", "Puzzle not found")}</Text>
        <PrimaryButton className="w-full" onPress={() => router.replace("/(tabs)/puzzles")}>{t("Voltar para a coleção", "Back to collection")}</PrimaryButton>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom"]} style={{ backgroundColor: colors.background }}>
      <View className="border-b px-4 pb-3 pt-2" style={{ borderBottomColor: `${colors.accent}25`, backgroundColor: colors.panel }}>
        <View className="flex-row items-center gap-3">
          <Pressable className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panelAlt }} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-black" numberOfLines={1} style={{ color: colors.text }}>{puzzle.name}</Text>
            <Text className="text-base font-extrabold" style={{ color: colors.accent }}>{progress}% · {placed} {t("de", "of")} {pieces.length}</Text>
          </View>
          {puzzle.configuration.referenceEnabled ? (
            <Pressable className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panelAlt }} onPress={() => setShowReference(true)}>
              <Ionicons name="image-outline" size={21} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
        <View className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.panelAlt }}>
          <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: colors.accent }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
        <NativePuzzleBoard
          imageUri={puzzle.imageUri}
          rows={puzzle.configuration.rows}
          columns={puzzle.configuration.columns}
          pieces={pieces}
          initialZoom={puzzle.session.camera.zoom}
          onPiecesChange={savePieces}
          onZoomChange={(zoom) => updatePuzzleCamera(puzzle.id, { ...puzzle.session.camera, zoom })}
        />
        {puzzle.configuration.hintsEnabled && progress < 100 ? (
          <SecondaryButton className="mt-4 w-full" onPress={useHint}>
            <Ionicons name="bulb-outline" size={20} color={colors.accent} />
            <Text className="font-bold" style={{ color: colors.text }}>{t("Encaixar uma peça", "Place one piece")}</Text>
          </SecondaryButton>
        ) : null}
      </ScrollView>

      <Modal visible={showReference} transparent animationType="fade" onRequestClose={() => setShowReference(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/90 px-5" onPress={() => setShowReference(false)}>
          <Image source={{ uri: puzzle.imageUri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 22 }} contentFit="contain" />
          <Text className="mt-5 text-base font-bold text-white">{t("Toque para fechar", "Tap to close")}</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
