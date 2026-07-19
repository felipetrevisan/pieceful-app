import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, ProgressBar, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function AchievementsScreen() {
  const { puzzles, t, theme } = useApp(); const colors = mobileThemes[theme];
  const completed = puzzles.filter((p) => p.session.completedAt).length;
  const placed = puzzles.reduce((sum, p) => sum + p.session.pieces.filter((piece) => piece.isPlaced).length, 0);
  const xp = completed * 500 + placed; const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const achievements = [
    { icon: "trophy-outline" as const, title: t("Mestre Puzzler", "Master Puzzler"), description: t("Finalize 10 puzzles em qualquer dificuldade.", "Finish 10 puzzles at any difficulty."), unlocked: completed >= 10, rarity: t("LENDÁRIO", "LEGENDARY"), progress: Math.min(100, completed * 10) },
    { icon: "timer-outline" as const, title: t("Demônio da Velocidade", "Speed Demon III"), description: t("Complete um puzzle sem usar dicas.", "Complete a puzzle without using hints."), unlocked: puzzles.some((p) => p.session.completedAt && p.session.hintsUsed === 0), rarity: t("ÉPICO", "EPIC"), progress: completed ? 100 : 0 },
    { icon: "eye-outline" as const, title: t("Olho de Águia", "Eagle Eye"), description: t("Encaixe 250 peças corretamente.", "Place 250 pieces correctly."), unlocked: placed >= 250, rarity: t("RARO", "RARE"), progress: Math.min(100, placed / 2.5) },
  ];
  return <Screen><AppHeader title={t("Conquistas", "Achievements")} showTitle />
    <LinearGradient colors={[`${colors.accent}28`, `${colors.primary}20`]} style={[styles.levelCard, { borderColor: `${colors.accent}45` }]}><Text style={[styles.level, { color: colors.accent }]}>{level}</Text><View style={{ flex: 1 }}><Text style={[styles.master, { color: colors.text }]}>{t("Mestre Puzzler", "Master Puzzler")}</Text><Text style={[styles.xp, { color: colors.muted }]}>{xp.toLocaleString()} / {(level * 1000).toLocaleString()} XP</Text><ProgressBar value={xp % 1000 / 10} /></View></LinearGradient>
    <View style={styles.segment}><Text style={[styles.segmentActive, { color: colors.accent, backgroundColor: colors.panelAlt }]}>{t("Geral", "General")}</Text><Text style={[styles.segmentText, { color: colors.muted }]}>{t("Velocidade", "Speed")}</Text><Text style={[styles.segmentText, { color: colors.muted }]}>{t("Precisão", "Accuracy")}</Text></View>
    <View style={{ gap: 15 }}>{achievements.map((item) => <View key={item.title} style={[styles.card, { backgroundColor: colors.panel, borderColor: item.unlocked ? `${colors.accent}38` : `${colors.muted}20`, opacity: item.unlocked ? 1 : .64 }]}><View style={styles.top}><View style={[styles.icon, { backgroundColor: colors.panelAlt }]}><Ionicons name={item.unlocked ? item.icon : "lock-closed-outline"} size={25} color={item.unlocked ? colors.accent : colors.muted} /></View><Text style={[styles.rarity, { color: colors.primary, backgroundColor: `${colors.primary}18` }]}>{item.rarity}</Text></View><Text style={[styles.title, { color: colors.text }]}>{item.unlocked ? item.title : "???"}</Text><Text style={[styles.description, { color: colors.muted }]}>{item.description}</Text><ProgressBar value={item.progress} /><Text style={[styles.unlocked, { color: item.unlocked ? colors.accent : colors.muted }]}>{item.unlocked ? t("Desbloqueado", "Unlocked") : `${Math.round(item.progress)}%`}</Text></View>)}</View>
  </Screen>;
}

const styles = StyleSheet.create({ levelCard: { borderWidth: 1, borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 22 }, level: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 58 }, master: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 20 }, xp: { fontFamily: "Inter_400Regular", fontSize: 12, marginVertical: 7 }, segment: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", minHeight: 50, borderRadius: 25, marginBottom: 20 }, segmentActive: { fontFamily: "Inter_700Bold", paddingHorizontal: 20, paddingVertical: 11, borderRadius: 22 }, segmentText: { fontFamily: "Inter_600SemiBold", fontSize: 12 }, card: { borderWidth: 1, borderRadius: 23, padding: 20, gap: 10 }, top: { flexDirection: "row", justifyContent: "space-between" }, icon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" }, rarity: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, fontFamily: "Inter_700Bold", fontSize: 10 }, title: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 21 }, description: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 }, unlocked: { fontFamily: "Inter_700Bold", fontSize: 11 }, });
