import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, IconButton, PrimaryButton, ProgressBar, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function PuzzlesScreen() {
  const { deletePuzzle, puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];
  function remove(id: string, name: string) { Alert.alert(t("Excluir puzzle?", "Delete puzzle?"), t(`“${name}” e seu progresso serão apagados.`, `“${name}” and its progress will be deleted.`), [{ text: t("Cancelar", "Cancel"), style: "cancel" }, { text: t("Excluir", "Delete"), style: "destructive", onPress: () => deletePuzzle(id) }]); }
  return (
    <Screen>
      <AppHeader title={t("Coleção", "Collection")} showTitle />
      <View style={styles.filterRow}><Text style={[styles.count, { color: colors.muted }]}>{puzzles.length} {t("puzzles", "puzzles")}</Text><Pressable style={styles.sort}><Ionicons name="options-outline" size={19} color={colors.accent} /><Text style={[styles.sortText, { color: colors.accent }]}>{t("ORDENAR", "SORT")}</Text></Pressable></View>
      {puzzles.length === 0 ? <View style={[styles.empty, { borderColor: `${colors.accent}30` }]}><Ionicons name="albums-outline" size={45} color={colors.accent} /><Text style={[styles.title, { color: colors.text }]}>{t("Sua coleção está vazia", "Your collection is empty")}</Text><PrimaryButton onPress={() => router.push("/(tabs)/create")}>{t("Criar primeiro puzzle", "Create first puzzle")}</PrimaryButton></View> : (
        <View style={{ gap: 18 }}>{puzzles.map((puzzle) => {
          const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
          const progress = Math.round((placed / puzzle.session.pieces.length) * 100);
          const done = progress === 100 || !!puzzle.session.completedAt;
          return <Pressable key={puzzle.id} onPress={() => router.push((done ? `/result/${puzzle.id}` : `/puzzle/${puzzle.id}`) as never)} style={({ pressed }) => [styles.card, { backgroundColor: colors.panel, borderColor: done ? `${colors.accent}55` : `${colors.primary}38`, opacity: pressed ? .86 : 1 }]}>
            <View style={[styles.imageFrame, { height: puzzle.configuration.rows > puzzle.configuration.columns ? 320 : 220, backgroundColor: colors.panelAlt }]}>
              <Image source={{ uri: puzzle.imageUri }} style={styles.image} contentFit="contain" transition={180} />
              <LinearGradient colors={["transparent", colors.panel]} style={styles.imageFade} />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{puzzle.name}</Text><Text style={[styles.status, { color: done ? colors.accent : colors.muted }]}>{done ? t("✓ CONCLUÍDO", "✓ COMPLETED") : t("EM ANDAMENTO", "IN PROGRESS")}</Text></View><IconButton icon="trash-outline" label={t("Excluir", "Delete")} tone="danger" onPress={() => remove(puzzle.id, puzzle.name)} /></View>
              {!done ? <><View style={styles.progressLabel}><Text style={[styles.meta, { color: colors.muted }]}>{placed}/{puzzle.session.pieces.length}</Text><Text style={[styles.percent, { color: colors.accent }]}>{progress}%</Text></View><ProgressBar value={progress} /></> : <View style={styles.doneRow}><Ionicons name="play-circle-outline" size={27} color={colors.accent} /><Text style={[styles.meta, { color: colors.muted }]}>{t("Ver resultado e timelapse", "View result and timelapse")}</Text></View>}
            </View>
          </Pressable>;
        })}</View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, count: { fontFamily: "Inter_400Regular", fontSize: 14 }, sort: { flexDirection: "row", gap: 6, alignItems: "center", minHeight: 44 }, sortText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  empty: { borderWidth: 1, borderRadius: 28, padding: 28, alignItems: "center", gap: 14 },
  card: { borderRadius: 25, borderWidth: 1, overflow: "hidden" }, imageFrame: { width: "100%" }, image: { width: "100%", height: "100%" }, imageFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 82 }, content: { padding: 18, gap: 11 }, titleRow: { flexDirection: "row", gap: 12, alignItems: "center" }, title: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 23 }, status: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, marginTop: 4 }, progressLabel: { flexDirection: "row", justifyContent: "space-between" }, meta: { fontFamily: "Inter_600SemiBold", fontSize: 13 }, percent: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 }, doneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
