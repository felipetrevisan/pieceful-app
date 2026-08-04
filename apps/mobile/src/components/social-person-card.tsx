import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { mobileThemes } from "@/constants/pieceful-theme";

export interface SocialPerson {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  online: boolean;
  xp: number;
}

export function SocialPersonCard({
  actionIcon,
  actionLabel,
  colors,
  disabled,
  onAction,
  onSecondary,
  player,
  secondaryLabel,
  t,
}: {
  actionIcon: keyof typeof Ionicons.glyphMap;
  actionLabel: string;
  colors: (typeof mobileThemes)[keyof typeof mobileThemes];
  disabled: boolean;
  onAction: () => void;
  onSecondary?: () => void;
  player: SocialPerson;
  secondaryLabel?: string;
  t: (portuguese: string, english: string) => string;
}) {
  return (
    <View
      style={[styles.card, { backgroundColor: colors.panel, borderColor: `${colors.muted}2d` }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.panelAlt }]}>
        {player.avatarUrl ? (
          <Image
            source={{ uri: player.avatarUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="person" size={23} color={colors.accent} />
        )}
        {player.online ? (
          <View
            style={[styles.online, { backgroundColor: "#47e887", borderColor: colors.panel }]}
          />
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {player.displayName}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {player.xp.toLocaleString()} XP ·{" "}
          {player.online ? t("online", "online") : t("offline", "offline")}
        </Text>
      </View>
      {secondaryLabel && onSecondary ? (
        <Pressable
          disabled={disabled}
          onPress={onSecondary}
          style={[styles.secondary, { borderColor: `${colors.muted}55` }]}
        >
          <Text style={[styles.secondaryText, { color: colors.muted }]}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable
        disabled={disabled}
        onPress={onAction}
        style={[styles.action, { backgroundColor: colors.accent, opacity: disabled ? 0.48 : 1 }]}
      >
        <Ionicons name={actionIcon} size={16} color={colors.background} />
        <Text style={[styles.actionText, { color: colors.background }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 19,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  online: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    right: 0,
    bottom: 1,
    borderWidth: 2,
  },
  copy: { flex: 1, minWidth: 0 },
  name: { fontFamily: "Inter_700Bold", fontSize: 13 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 9, marginTop: 3 },
  action: {
    minHeight: 36,
    maxWidth: 96,
    borderRadius: 18,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  actionText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  secondary: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 8 },
});
