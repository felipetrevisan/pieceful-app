import { Ionicons } from "@expo/vector-icons";
import type { PuzzlePiece } from "@puzzled/puzzle-engine";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativePuzzleBoard } from "@/components/native-puzzle-board";
import { IconButton, PrimaryButton, SecondaryButton } from "@/components/pieceful-ui";
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
      setTimeout(() => router.replace(`/result/${id}` as never), 500);
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
      <View style={[styles.toolbar, { borderColor: `${colors.accent}35`, backgroundColor: colors.panel }]}>
        <LinearGradient colors={[`${colors.accent}35`, "transparent"]} style={[StyleSheet.absoluteFill, { width: `${progress}%` }]} />
        <View className="flex-row items-center gap-3">
          <IconButton icon="chevron-back" label={t("Voltar", "Back")} onPress={() => router.back()} />
          <View className="flex-1">
            <Text className="text-lg font-black" numberOfLines={1} style={{ color: colors.text }}>{puzzle.name}</Text>
            <Text className="text-base font-extrabold" style={{ color: colors.accent }}>{progress}% · {placed} {t("de", "of")} {pieces.length}</Text>
          </View>
          {puzzle.configuration.referenceEnabled ? (
            <IconButton icon="image-outline" label={t("Ver referência", "View reference")} onPress={() => setShowReference(true)} />
          ) : null}
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
          <SecondaryButton className="mt-4" icon="bulb-outline" onPress={useHint}>{t("Encaixar uma peça", "Place one piece")}</SecondaryButton>
        ) : null}
      </ScrollView>

      <Modal visible={showReference} transparent animationType="fade" onRequestClose={() => setShowReference(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/90 px-5" onPress={() => setShowReference(false)}>
          <Image
            source={{ uri: puzzle.imageUri }}
            style={{ width: "100%", aspectRatio: puzzle.configuration.columns / puzzle.configuration.rows, maxHeight: "72%", borderRadius: 22 }}
            contentFit="contain"
            transition={180}
          />
          <Text className="mt-5 text-base font-bold text-white">{t("Toque para fechar", "Tap to close")}</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ toolbar: { marginHorizontal: 12, marginTop: 6, borderRadius: 25, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, overflow: "hidden" } });
