import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

const avatarIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  happy: "happy-outline",
  rocket: "rocket-outline",
  paw: "paw-outline",
  planet: "planet-outline",
  star: "star-outline",
  trophy: "trophy-outline",
};

export function RewardAvatar({ id, size = 72 }: { id: string; size?: number }) {
  const icon = avatarIcons[id] ?? "sparkles-outline";
  const radius = size / 2;
  return (
    <LinearGradient
      colors={["#22e4ec", "#8ca3ff", "#f7a8ec"]}
      style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}
    >
      <View style={[styles.avatarGlow, { borderRadius: radius }]} />
      <Ionicons name={icon} size={size * 0.48} color="#071126" />
    </LinearGradient>
  );
}

export function rewardFrameColors(id: string | null) {
  switch (id) {
    case "aurora": return ["#46f4dd", "#a98cff"] as const;
    case "carbon": return ["#cbd3df", "#303846"] as const;
    case "galaxy": return ["#9d7cff", "#ff65d6"] as const;
    case "platinum": return ["#ffffff", "#8fdcf2"] as const;
    case "legend": return ["#ffd75e", "#ff7b4f"] as const;
    default: return ["#19dff0", "#a684ff"] as const;
  }
}

export function RewardFrame({ children, id, size }: { children: React.ReactNode; id: string; size: number }) {
  return (
    <LinearGradient
      colors={[...rewardFrameColors(id)]}
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View style={[styles.frameInner, { borderRadius: (size - 8) / 2 }]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarGlow: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, margin: 5, backgroundColor: "rgba(255,255,255,.2)" },
  frame: { padding: 4, alignItems: "center", justifyContent: "center", shadowColor: "#65eeff", shadowOpacity: 0.42, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 7 },
  frameInner: { width: "100%", height: "100%", overflow: "hidden", alignItems: "center", justifyContent: "center" },
});
