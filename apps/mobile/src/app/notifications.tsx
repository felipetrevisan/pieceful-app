import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, ProgressBar, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export default function NotificationsScreen() {
  const { ageGroup, markNotificationsRead, puzzles, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const active = puzzles.find((puzzle) => !puzzle.session.completedAt);
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).length;
  const placed = puzzles.reduce(
    (sum, puzzle) => sum + puzzle.session.pieces.filter((piece) => piece.isPlaced).length,
    0,
  );
  const xp = completed * 500 + placed;
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const levelProgress = xp % 1000;

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
        <ProgressBar value={levelProgress / 10} />
        <Text style={[styles.xpMeta, { color: colors.muted }]}>
          {levelProgress.toLocaleString()} / 1.000 XP
        </Text>
        <Text style={[styles.xpExplanation, { color: colors.muted }]}>
          {t(
            "O XP aumenta seu nível e desbloqueará recompensas cosméticas, temas e molduras. Você ganha 1 XP por peça e 500 XP por conclusão.",
            "XP raises your level and will unlock cosmetic rewards, themes, and frames. You earn 1 XP per piece and 500 XP per completion.",
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
          backgroundColor: colors.panel,
          borderColor: `${colors.accent}42`,
          borderRadius: Math.max(18, colors.radius),
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: colors.panelAlt }]}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <View style={styles.notificationCopy}>
        <Text style={[styles.notificationTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.notificationDescription, { color: colors.muted }]}>{description}</Text>
        <Text style={[styles.notificationAction, { color: colors.accent }]}>{action}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
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
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  notificationIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: { flex: 1, gap: 4 },
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
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    marginTop: 4,
  },
  xpCard: { marginTop: 10, gap: 10 },
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
