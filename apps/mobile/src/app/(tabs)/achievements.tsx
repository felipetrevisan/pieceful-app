import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { AppHeader, ProgressBar, Screen, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getLevelRewards, getPlayerProgression, MAX_PLAYER_LEVEL } from "@/lib/progression";
import { gamePlatformAvailable, showPlatformAchievements } from "@/services/game-platform";
import { useApp } from "@/state/app-provider";

export default function AchievementsScreen() {
  const { ageGroup, claimedRewardIds, claimLevelReward, equipReward, hintCredits, puzzles, selectedAvatarRewardId, selectedFrameRewardId, setTheme, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const progression = getPlayerProgression(puzzles);
  const rewards = getLevelRewards(ageGroup);
  const visibleRewards = rewards.filter((reward) => reward.level <= progression.level + 6).slice(-12).reverse();
  const achievements = [
    { icon: "trophy-outline" as const, title: t("Mestre dos Quebra-cabeças", "Master Puzzler"), description: t("Finalize 10 quebra-cabeças em qualquer dificuldade.", "Finish 10 puzzles at any difficulty."), unlocked: progression.completedPuzzles >= 10, rarity: t("LENDÁRIO", "LEGENDARY"), progress: Math.min(100, progression.completedPuzzles * 10) },
    { icon: "timer-outline" as const, title: t("Sem atalhos", "No Shortcuts"), description: t("Complete um quebra-cabeça sem usar dicas.", "Complete a puzzle without using hints."), unlocked: puzzles.some((puzzle) => puzzle.session.completedAt && puzzle.session.hintsUsed === 0), rarity: t("ÉPICO", "EPIC"), progress: progression.completedPuzzles ? 100 : 0 },
    { icon: "eye-outline" as const, title: t("Olho de Águia", "Eagle Eye"), description: t("Encaixe 250 peças corretamente.", "Place 250 pieces correctly."), unlocked: progression.placedPieces >= 250, rarity: t("RARO", "RARE"), progress: Math.min(100, progression.placedPieces / 2.5) },
  ];

  function claimReward(rewardId: string, themeId?: string) {
    if (!claimLevelReward(rewardId)) return;
    if (themeId && themeId in mobileThemes) setTheme(themeId as keyof typeof mobileThemes);
    showAlert(
      t("Recompensa resgatada!", "Reward claimed!"),
      t("Ela já foi adicionada à sua conta Pieceful.", "It has been added to your Pieceful account."),
    );
  }

  return <Screen><AppHeader title={t("Conquistas e recompensas", "Achievements & rewards")} showTitle back />
    <LinearGradient colors={[`${colors.accent}28`, `${colors.primary}20`]} style={[styles.levelCard, { borderColor: `${colors.accent}45` }]}>
      <Text style={[styles.level, { color: colors.accent }]}>{progression.level}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.master, { color: colors.text }]}>{progression.level === MAX_PLAYER_LEVEL ? t("Lenda Pieceful", "Pieceful Legend") : t("Jornada até o nível 100", "Road to level 100")}</Text>
        <Text style={[styles.xp, { color: colors.muted }]}>{progression.level === MAX_PLAYER_LEVEL ? `${progression.totalXp.toLocaleString()} XP · MAX` : `${progression.xpIntoLevel.toLocaleString()} / ${progression.xpForNextLevel.toLocaleString()} XP`}</Text>
        <ProgressBar value={progression.progressPercent} />
      </View>
    </LinearGradient>

    <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>{t("Recompensas de nível", "Level rewards")}</Text><Text style={[styles.sectionDescription, { color: colors.muted }]}>{t("Suba de nível e resgate novos prêmios.", "Level up and claim new prizes.")}</Text></View><View style={[styles.hintPill, { backgroundColor: colors.panelAlt }]}><Ionicons name="bulb-outline" size={16} color={colors.accent} /><Text style={[styles.hintCount, { color: colors.text }]}>{hintCredits}</Text></View></View>
    <View style={styles.rewardList}>{visibleRewards.map((reward) => {
      const unlocked = progression.level >= reward.level;
      const claimed = claimedRewardIds.includes(reward.id);
      const cosmeticKind = reward.kind === "avatar" || reward.kind === "frame" ? reward.kind : null;
      const equipped = reward.id === selectedAvatarRewardId || reward.id === selectedFrameRewardId;
      const actionDisabled = !unlocked || (claimed && !cosmeticKind);
      const actionLabel = !unlocked ? t("Bloqueado", "Locked") : equipped ? t("Equipado", "Equipped") : claimed && cosmeticKind ? t("Equipar", "Equip") : claimed ? t("Resgatado", "Claimed") : t("Resgatar", "Claim");
      return <View key={reward.id} style={[styles.rewardCard, { borderColor: unlocked ? `${colors.accent}50` : `${colors.muted}24` }]}>
        <FrostedBackdrop intensity={unlocked ? 56 : 34} />
        <View style={[styles.rewardIcon, { backgroundColor: colors.panelAlt }]}><Ionicons name={(unlocked ? reward.icon : "lock-closed-outline") as keyof typeof Ionicons.glyphMap} size={24} color={unlocked ? colors.accent : colors.muted} /></View>
        <View style={styles.rewardCopy}><Text style={[styles.rewardLevel, { color: colors.primary }]}>{t(`NÍVEL ${reward.level}`, `LEVEL ${reward.level}`)}</Text><Text style={[styles.rewardTitle, { color: colors.text }]}>{t(reward.titlePt, reward.titleEn)}</Text><Text style={[styles.rewardDescription, { color: colors.muted }]}>{t(reward.descriptionPt, reward.descriptionEn)}</Text></View>
        <Pressable disabled={actionDisabled} onPress={() => claimed && cosmeticKind ? equipReward(cosmeticKind, reward.id) : claimReward(reward.id, reward.kind === "theme" ? reward.contentKey : undefined)} style={[styles.claimButton, { backgroundColor: equipped ? colors.primary : claimed ? colors.panelAlt : unlocked ? colors.accent : `${colors.muted}24` }]}><Text style={[styles.claimText, { color: equipped || (!claimed && unlocked) ? colors.background : colors.muted }]}>{actionLabel}</Text></Pressable>
      </View>;
    })}</View>

    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28 }]}>{t("Conquistas", "Achievements")}</Text>
    <View style={{ gap: 15, marginTop: 14 }}>{achievements.map((item) => <View key={item.title} style={[styles.card, { borderColor: item.unlocked ? `${colors.accent}48` : `${colors.muted}28`, opacity: item.unlocked ? 1 : .64 }]}><FrostedBackdrop intensity={item.unlocked ? 58 : 42} /><View style={styles.top}><View style={[styles.icon, { backgroundColor: colors.panelAlt }]}><Ionicons name={item.unlocked ? item.icon : "lock-closed-outline"} size={25} color={item.unlocked ? colors.accent : colors.muted} /></View><Text style={[styles.rarity, { color: colors.primary, backgroundColor: `${colors.primary}18` }]}>{item.rarity}</Text></View><Text style={[styles.title, { color: colors.text }]}>{item.unlocked ? item.title : "???"}</Text><Text style={[styles.description, { color: colors.muted }]}>{item.description}</Text><ProgressBar value={item.progress} /><Text style={[styles.unlocked, { color: item.unlocked ? colors.accent : colors.muted }]}>{item.unlocked ? t("Desbloqueado", "Unlocked") : `${Math.round(item.progress)}%`}</Text></View>)}</View>
    <SecondaryButton icon={Platform.OS === "ios" ? "game-controller-outline" : "logo-google-playstore"} onPress={() => void showPlatformAchievements().catch(() => showAlert(t("Serviço indisponível", "Service unavailable"), t("Use um development build e configure as conquistas da plataforma.", "Use a development build and configure platform achievements.")))} disabled={!gamePlatformAvailable}>{Platform.OS === "ios" ? t("Abrir Game Center", "Open Game Center") : t("Abrir Play Games", "Open Play Games")}</SecondaryButton>
  </Screen>;
}

const styles = StyleSheet.create({
  levelCard: { borderWidth: 1, borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 22 },
  level: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 58 }, master: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 20 }, xp: { fontFamily: "Inter_400Regular", fontSize: 12, marginVertical: 7 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 14 }, sectionTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 24 }, sectionDescription: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 3 }, hintPill: { height: 42, minWidth: 66, paddingHorizontal: 14, borderRadius: 21, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, hintCount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  rewardList: { gap: 12 }, rewardCard: { minHeight: 112, borderWidth: 1, borderRadius: 22, overflow: "hidden", padding: 15, flexDirection: "row", alignItems: "center", gap: 13 }, rewardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, rewardCopy: { flex: 1 }, rewardLevel: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.1 }, rewardTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 17, marginTop: 3 }, rewardDescription: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 }, claimButton: { minWidth: 76, minHeight: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, claimText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  card: { borderWidth: 1, borderRadius: 23, padding: 20, gap: 10, overflow: "hidden" }, top: { flexDirection: "row", justifyContent: "space-between" }, icon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" }, rarity: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, fontFamily: "Inter_700Bold", fontSize: 10 }, title: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 21 }, description: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 }, unlocked: { fontFamily: "Inter_700Bold", fontSize: 11 },
});
