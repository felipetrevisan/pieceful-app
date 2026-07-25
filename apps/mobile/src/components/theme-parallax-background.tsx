import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { mobileThemeCatalog, mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export function ThemeParallaxBackground({
  celebratory = false,
  scrollY,
}: {
  celebratory?: boolean;
  scrollY?: SharedValue<number>;
}) {
  const { preferences, theme } = useApp();
  const colors = mobileThemes[theme];
  const atmosphereIcon =
    mobileThemeCatalog.find((item) => item.id === theme)?.icon ?? "sparkles-outline";
  const drift = useSharedValue(0);

  useEffect(() => {
    if (preferences.reducedMotion) {
      cancelAnimation(drift);
      drift.set(0.35);
      return;
    }
    drift.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 7600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 7600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(drift);
  }, [drift, preferences.reducedMotion]);

  const farStyle = useAnimatedStyle(() => {
    const scroll = preferences.reducedMotion ? 0 : (scrollY?.get() ?? 0);
    return {
      opacity: 0.2 + drift.get() * 0.08,
      transform: [
        { translateX: -18 + drift.get() * 34 },
        { translateY: 18 + drift.get() * 28 - scroll * 0.07 },
        { rotate: `${-8 + drift.get() * 8}deg` },
        { scale: 0.94 + drift.get() * 0.1 },
      ],
    };
  });
  const nearStyle = useAnimatedStyle(() => {
    const scroll = preferences.reducedMotion ? 0 : (scrollY?.get() ?? 0);
    return {
      opacity: 0.13 + (1 - drift.get()) * 0.08,
      transform: [
        { translateX: 22 - drift.get() * 42 },
        { translateY: -12 - drift.get() * 38 - scroll * 0.13 },
        { scale: 0.9 + (1 - drift.get()) * 0.16 },
      ],
    };
  });
  const sparkleStyle = useAnimatedStyle(() => {
    const scroll = preferences.reducedMotion ? 0 : (scrollY?.get() ?? 0);
    return {
      opacity: celebratory ? 0.2 + drift.get() * 0.32 : 0.1 + drift.get() * 0.12,
      transform: [
        { translateX: drift.get() * 24 },
        { translateY: -scroll * 0.18 },
        { rotate: `${drift.get() * 24}deg` },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={[`${colors.primary}12`, "transparent", `${colors.accent}08`]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.farOrb, farStyle]}>
        <LinearGradient
          colors={[`${colors.accent}08`, `${colors.primary}78`, `${colors.accent}14`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={atmosphereIcon} size={96} color={`${colors.accent}4c`} />
      </Animated.View>
      <Animated.View
        style={[
          styles.nearOrb,
          { backgroundColor: `${colors.accent}42`, borderColor: `${colors.primary}42` },
          nearStyle,
        ]}
      />
      <Animated.View style={[styles.sparkles, sparkleStyle]}>
        <Ionicons
          name={celebratory ? "sparkles" : "diamond-outline"}
          size={celebratory ? 76 : 46}
          color={colors.accent}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  farOrb: {
    position: "absolute",
    right: -105,
    top: 180,
    width: 330,
    height: 330,
    borderRadius: 165,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  nearOrb: {
    position: "absolute",
    left: -90,
    top: 560,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
  },
  sparkles: { position: "absolute", right: 35, top: 92 },
});
