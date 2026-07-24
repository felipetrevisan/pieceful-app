import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader, IconButton, PrimaryButton, ProgressBar, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function PuzzlesScreen() {
  const { deletePuzzle, puzzles, renamePuzzle, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const [sortBy, setSortBy] = useState<"recent" | "name" | "progress">("recent");
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const canSort = puzzles.length > 1;
  const sortedPuzzles = useMemo(() => [...puzzles].sort((left, right) => {
    if (sortBy === "name") return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    if (sortBy === "progress") {
      const leftProgress = left.session.pieces.filter((piece) => piece.isPlaced).length / left.session.pieces.length;
      const rightProgress = right.session.pieces.filter((piece) => piece.isPlaced).length / right.session.pieces.length;
      return rightProgress - leftProgress || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }), [puzzles, sortBy]);

  function openSort() {
    if (!canSort) return;
    const options = [t("Mais recentes", "Most recent"), t("Nome: A–Z", "Name: A–Z"), t("Maior progresso", "Most progress")];
    const choose = (index: number) => {
      if (index === 0) setSortBy("recent");
      if (index === 1) setSortBy("name");
      if (index === 2) setSortBy("progress");
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, t("Cancelar", "Cancel")], cancelButtonIndex: 3, title: t("Ordenar coleção", "Sort collection") },
        choose,
      );
      return;
    }
    Alert.alert(t("Ordenar coleção", "Sort collection"), undefined, options.map((text, index) => ({ text, onPress: () => choose(index) })));
  }

  function remove(id: string, name: string) { Alert.alert(t("Excluir quebra-cabeça?", "Delete puzzle?"), t(`“${name}” e seu progresso serão apagados.`, `“${name}” and its progress will be deleted.`), [{ text: t("Cancelar", "Cancel"), style: "cancel" }, { text: t("Excluir", "Delete"), style: "destructive", onPress: () => deletePuzzle(id) }]); }
  function openRename(id: string, name: string) {
    setRenameDraft(name);
    setRenameTarget({ id, name });
  }
  function confirmRename() {
    if (!renameTarget || !renameDraft.trim()) return;
    renamePuzzle(renameTarget.id, renameDraft);
    setRenameTarget(null);
  }
  return <>
    <Screen>
      <AppHeader title={t("Coleção", "Collection")} showTitle />
      <View style={styles.filterRow}><Text style={[styles.count, { color: colors.muted }]}>{puzzles.length} {t("quebra-cabeças", "puzzles")}</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSort }} disabled={!canSort} onPress={openSort} style={({ pressed }) => [styles.sort, { opacity: !canSort ? 0.35 : pressed ? 0.65 : 1 }]}><View style={styles.sortContent}><Ionicons name="options-outline" size={19} color={canSort ? colors.accent : colors.muted} /><Text numberOfLines={1} style={[styles.sortText, { color: canSort ? colors.accent : colors.muted }]}>{t("ORDENAR", "SORT")}</Text></View></Pressable></View>
      {puzzles.length === 0 ? <View style={[styles.empty, { borderColor: `${colors.accent}30` }]}><Ionicons name="albums-outline" size={45} color={colors.accent} /><Text style={[styles.title, { color: colors.text }]}>{t("Sua coleção está vazia", "Your collection is empty")}</Text><PrimaryButton onPress={() => router.push("/(tabs)/create")}>{t("Criar primeiro quebra-cabeça", "Create first puzzle")}</PrimaryButton></View> : (
        <View style={{ gap: 18 }}>{sortedPuzzles.map((puzzle) => {
          const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
          const progress = Math.round((placed / puzzle.session.pieces.length) * 100);
          const done = progress === 100 || !!puzzle.session.completedAt;
          return <Pressable key={puzzle.id} onPress={() => router.push((done ? `/result/${puzzle.id}` : `/puzzle/${puzzle.id}`) as never)} style={({ pressed }) => [styles.card, { backgroundColor: colors.panel, borderColor: done ? `${colors.accent}55` : `${colors.primary}38`, opacity: pressed ? .86 : 1 }]}>
            <View style={[styles.imageFrame, { height: puzzle.configuration.rows > puzzle.configuration.columns ? 320 : 220, backgroundColor: colors.panelAlt }]}>
              <Image source={{ uri: puzzle.imageUri }} style={styles.image} contentFit="contain" transition={180} />
              <LinearGradient colors={["transparent", colors.panel]} style={styles.imageFade} />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{puzzle.name}</Text><Text style={[styles.status, { color: done ? colors.accent : colors.muted }]}>{done ? t("✓ CONCLUÍDO", "✓ COMPLETED") : t("EM ANDAMENTO", "IN PROGRESS")}</Text></View><View style={styles.cardActions}><IconButton icon="pencil-outline" label={t("Renomear", "Rename")} onPress={(event) => { event.stopPropagation(); openRename(puzzle.id, puzzle.name); }} /><IconButton icon="trash-outline" label={t("Excluir", "Delete")} tone="danger" onPress={(event) => { event.stopPropagation(); remove(puzzle.id, puzzle.name); }} /></View></View>
              {!done ? <><View style={styles.progressLabel}><Text style={[styles.meta, { color: colors.muted }]}>{placed}/{puzzle.session.pieces.length}</Text><Text style={[styles.percent, { color: colors.accent }]}>{progress}%</Text></View><ProgressBar value={progress} /></> : <View style={styles.doneRow}><Ionicons name="play-circle-outline" size={27} color={colors.accent} /><Text style={[styles.meta, { color: colors.muted }]}>{t("Ver resultado e timelapse", "View result and timelapse")}</Text></View>}
            </View>
          </Pressable>;
        })}</View>
      )}
    </Screen>
    <Modal visible={!!renameTarget} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setRenameTarget(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <Pressable accessibilityLabel={t("Fechar diálogo", "Close dialog")} style={StyleSheet.absoluteFill} onPress={() => setRenameTarget(null)} />
        <View style={[styles.dialog, { backgroundColor: colors.panel, borderColor: `${colors.accent}55`, borderRadius: Math.max(18, colors.radius + 8) }]}>
          <View style={[styles.dialogIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name="pencil" size={24} color={colors.accent} /></View>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>{t("Renomear quebra-cabeça", "Rename puzzle")}</Text>
          <Text style={[styles.dialogDescription, { color: colors.muted }]}>{t("Escolha um nome fácil de reconhecer na sua coleção.", "Choose a name that is easy to recognize in your collection.")}</Text>
          <TextInput
            autoFocus
            value={renameDraft}
            onChangeText={setRenameDraft}
            maxLength={60}
            returnKeyType="done"
            selectTextOnFocus
            onSubmitEditing={confirmRename}
            placeholder={t("Nome do quebra-cabeça", "Puzzle name")}
            placeholderTextColor={colors.muted}
            style={[styles.renameInput, { color: colors.text, backgroundColor: colors.panelAlt, borderColor: `${colors.accent}55` }]}
          />
          <View style={styles.dialogActions}>
            <Pressable onPress={() => setRenameTarget(null)} style={({ pressed }) => [styles.dialogButton, { backgroundColor: colors.panelAlt, opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.dialogButtonText, { color: colors.text }]}>{t("Cancelar", "Cancel")}</Text></Pressable>
            <Pressable disabled={!renameDraft.trim()} onPress={confirmRename} style={({ pressed }) => [styles.dialogButton, { backgroundColor: colors.accent, opacity: !renameDraft.trim() ? 0.35 : pressed ? 0.7 : 1 }]}><Text style={[styles.dialogButtonText, { color: colors.background }]}>{t("Salvar", "Save")}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, count: { fontFamily: "Inter_400Regular", fontSize: 14 }, sort: { minWidth: 108, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }, sortContent: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", columnGap: 7 }, sortText: { fontFamily: "Inter_700Bold", fontSize: 12, lineHeight: 19, letterSpacing: 1, textAlignVertical: "center" },
  empty: { borderWidth: 1, borderRadius: 28, padding: 28, alignItems: "center", gap: 14 },
  card: { borderRadius: 25, borderWidth: 1, overflow: "hidden" }, imageFrame: { width: "100%" }, image: { width: "100%", height: "100%" }, imageFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 82 }, content: { padding: 18, gap: 11 }, titleRow: { flexDirection: "row", gap: 12, alignItems: "center" }, cardActions: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 23 }, status: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, marginTop: 4 }, progressLabel: { flexDirection: "row", justifyContent: "space-between" }, meta: { fontFamily: "Inter_600SemiBold", fontSize: 13 }, percent: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 }, doneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalRoot: { flex: 1, backgroundColor: "rgba(2,6,16,.72)", alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 420, borderWidth: 1, padding: 22, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 18 }, shadowOpacity: .4, shadowRadius: 30, elevation: 18 },
  dialogIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  dialogTitle: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 25, textAlign: "center" },
  dialogDescription: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, marginBottom: 18 },
  renameInput: { width: "100%", height: 56, borderRadius: 17, borderWidth: 1, paddingHorizontal: 16, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  dialogActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 16 },
  dialogButton: { flex: 1, minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  dialogButtonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
