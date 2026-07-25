import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { AppHeader, Card, ProgressBar, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getNextLevelReward, getPlayerProgression } from "@/lib/progression";
import { useApp } from "@/state/app-provider";

export default function NotificationsScreen() {
  const { ageGroup, markNotificationsRead, puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const active = puzzles.find((puzzle) => !puzzle.session.completedAt);
  const progression = getPlayerProgression(puzzles);
  const nextReward = getNextLevelReward(ageGroup, progression.level);
  const level = progression.level;

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <Screen>
      <AppHeader
        back
        showNotifications={false}
        showTitle
        title={t("Notificações", "Notifications")}
      />

      <Text style={[styles.eyebrow, { color: colors.accent }]}>
        {t("HOJE NO PIECEFUL", "TODAY IN PIECEFUL")}
      </Text>

      <View style={styles.notificationList}>
        <NotificationCard
          icon={ageGroup === "child" ? "star" : "sparkles"}
          title={
            ageGroup === "child"
              ? t("Sua missão colorida chegou", "Your colorful mission is here")
              : t("Desafio diário disponível", "Daily challenge available")
          }
          description={t(
            "Conclua um quebra-cabeça hoje para receber 500 XP, além de 1 XP por peça encaixada.",
            "Complete a puzzle today to earn 500 XP, plus 1 XP for every placed piece.",
          )}
          action={t("Começar desafio", "Start challenge")}
          onPress={() => router.push("/(tabs)/create")}
        />

        {active ? (
          <NotificationCard
            icon="play"
            title={t("Continue de onde parou", "Continue where you left off")}
            description={`${active.name} · ${Math.round(
              (active.session.pieces.filter((piece) => piece.isPlaced).length /
                active.session.pieces.length) *
                100,
            )}%`}
            action={t("Continuar montagem", "Continue puzzle")}
            onPress={() => router.push(`/puzzle/${active.id}` as never)}
          />
        ) : null}

        <NotificationCard
          icon="images-outline"
          title={t("Descubra novos pacotes", "Discover new packs")}
          description={t(
            "Baixe coleções prontas e mantenha suas favoritas disponíveis offline.",
            "Download ready-made collections and keep your favorites available offline.",
          )}
          action={t("Explorar pacotes", "Browse packs")}
          onPress={() => router.push("/(tabs)/create")}
        />
      </View>

      <Card style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <View>
            <Text style={[styles.xpKicker, { color: colors.primary }]}>
              {t("SUA PROGRESSÃO", "YOUR PROGRESS")}
            </Text>
            <Text style={[styles.xpTitle, { color: colors.text }]}>
              {t(`Nível ${level}`, `Level ${level}`)}
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: colors.panelAlt }]}>
            <Text style={[styles.levelNumber, { color: colors.accent }]}>{level}</Text>
          </View>
        </View>
        <ProgressBar value={progression.progressPercent} />
        <Text style={[styles.xpMeta, { color: colors.muted }]}>
          {level === 100
            ? `${progression.totalXp.toLocaleString()} XP · MAX`
            : `${progression.xpIntoLevel.toLocaleString()} / ${progression.xpForNextLevel.toLocaleString()} XP`}
        </Text>
        <Text style={[styles.xpExplanation, { color: colors.muted }]}>
          {nextReward
            ? t(
                `Próxima recompensa no nível ${nextReward.level}: ${nextReward.titlePt}. Ganhe XP encaixando peças, concluindo desafios e jogando sem dicas.`,
                `Next reward at level ${nextReward.level}: ${nextReward.titleEn}. Earn XP by placing pieces, completing challenges, and playing without hints.`,
              )
            : t(
                "Você chegou ao nível máximo e desbloqueou a recompensa lendária.",
                "You reached the maximum level and unlocked the legendary reward.",
              )}
        </Text>
      </Card>
    </Screen>
  );
}

function NotificationCard({
  action,
  description,
  icon,
  onPress,
  title,
}: {
  action: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.notification,
        {
          borderColor: `${colors.accent}42`,
          borderRadius: Math.max(18, colors.radius),
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <FrostedBackdrop intensity={72} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `${colors.panel}A8` }]}
      />
      <View style={styles.notificationRow}>
        <View style={[styles.notificationIcon, { backgroundColor: colors.panelAlt }]}>
          <Ionicons name={icon} size={24} color={colors.accent} />
        </View>
        <View style={styles.notificationCopy}>
          <Text style={[styles.notificationTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.notificationDescription, { color: colors.muted }]}>
            {description}
          </Text>
          <View
            style={[
              styles.notificationAction,
              { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}70` },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.notificationActionText, { color: colors.accent }]}
            >
              {action}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 14,
  },
  notification: {
    width: "100%",
    borderWidth: 1,
    padding: 17,
    overflow: "hidden",
  },
  notificationList: {
    width: "100%",
    gap: 14,
    marginBottom: 16,
  },
  notificationRow: { width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 14 },
  notificationIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: { flex: 1, minWidth: 0, gap: 5 },
  notificationTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 17,
  },
  notificationDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  notificationAction: {
    minHeight: 38,
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginTop: 7,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  notificationActionText: { flexShrink: 1, fontFamily: "Inter_700Bold", fontSize: 12 },
  xpCard: { gap: 10 },
  xpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  xpKicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 },
  xpTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 23,
    marginTop: 3,
  },
  levelBadge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 23 },
  xpMeta: { fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "right" },
  xpExplanation: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
});
