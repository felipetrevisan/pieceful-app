import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "@/state/app-provider";

const BRAND_CYAN = "#63edf2";
const BRAND_LAVENDER = "#b8a7ff";
const SPLASH_BACKGROUND = "#050b20";
const MINIMUM_SPLASH_TIME = 3200;

export function StartupSplash({
  resourcesReady,
  fontsLoaded,
  onFinished,
}: {
  resourcesReady: boolean;
  fontsLoaded: boolean;
  onFinished: () => void;
}) {
  const { language } = useApp();
  const startedAt = useRef<number | null>(null);
  const progress = useSharedValue(0.06);
  const pulse = useSharedValue(0);
  const backgroundDrift = useSharedValue(0);
  const [percentage, setPercentage] = useState(6);

  useEffect(() => {
    startedAt.current = Date.now();
    progress.set(withTiming(0.9, { duration: 3000, easing: Easing.out(Easing.cubic) }));
    pulse.set(withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    ));
    backgroundDrift.set(withRepeat(
      withSequence(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    ));
    const percentageTimer = setInterval(
      () => setPercentage((current) => current >= 90 ? current : Math.min(90, current + 2)),
      75,
    );

    return () => {
      clearInterval(percentageTimer);
      pulse.set(0);
      backgroundDrift.set(0);
    };
  }, [backgroundDrift, progress, pulse]);

  useEffect(() => {
    if (!resourcesReady) return;
    const elapsed = startedAt.current === null ? 0 : Date.now() - startedAt.current;
    const remainingFakeLoadingTime = Math.max(0, MINIMUM_SPLASH_TIME - elapsed);
    const timeout = setTimeout(() => {
      setPercentage(100);
      progress.set(withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinished)();
      }));
    }, remainingFakeLoadingTime);
    return () => clearTimeout(timeout);
  }, [onFinished, progress, resourcesReady]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.get() * 0.055 }] }));
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + backgroundDrift.get() * 0.1,
    transform: [
      { translateX: -8 + backgroundDrift.get() * 16 },
      { translateY: -14 + backgroundDrift.get() * 28 },
      { scale: 1.08 + backgroundDrift.get() * 0.035 },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: SPLASH_BACKGROUND }]}>
      <Animated.Image
        source={require("../../assets/images/splash-background.png")}
        resizeMode="cover"
        style={[styles.backgroundImage, backgroundStyle]}
      />
      <LinearGradient
        colors={["rgba(4,10,28,.18)", "rgba(4,10,28,.42)", "rgba(4,10,28,.78)"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.brandArea}>
        <Animated.View style={[styles.logoHalo, logoStyle]}>
          <Image source={require("../../assets/images/pieceful-logo.png")} style={styles.logoAsset} contentFit="contain" />
          <View style={[styles.sparkle, styles.sparkleTop]} />
          <View style={[styles.sparkle, styles.sparkleRight]} />
        </Animated.View>

        <Text style={[styles.title, fontsLoaded ? styles.titleFont : null]}>Pieceful</Text>
        <Text style={[styles.tagline, fontsLoaded ? styles.taglineFont : null]}>One piece at a time.</Text>
      </View>

      <View style={styles.loadingArea}>
        <View style={styles.loadingCopy}>
          <Text style={[styles.loadingText, fontsLoaded ? styles.loadingFont : null]}>
            {language === "en" ? "Preparing your pieces" : "Preparando suas peças"}
          </Text>
          <Text style={[styles.percentage, fontsLoaded ? styles.percentageFont : null]}>{percentage}%</Text>
        </View>
        <View
          accessibilityLabel={language === "en" ? "Loading application" : "Carregando aplicativo"}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: percentage }}
          style={styles.track}
        >
          <Animated.View style={[styles.progress, progressStyle]}>
            <LinearGradient colors={[BRAND_CYAN, BRAND_LAVENDER]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 32,
  },
  backgroundImage: {
    position: "absolute",
    left: -30,
    right: -30,
    top: -48,
    bottom: -48,
    width: undefined,
    height: undefined,
  },
  brandArea: {
    alignItems: "center",
    marginTop: -42,
  },
  logoHalo: {
    width: 146,
    height: 146,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(99,237,242,.34)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  logoAsset: {
    width: 122,
    height: 122,
    shadowColor: "#00f2ff",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 10,
  },
  sparkle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: BRAND_CYAN,
    transform: [{ rotate: "45deg" }],
  },
  sparkleTop: { top: 8, right: 16 },
  sparkleRight: { right: -5, bottom: 32, width: 7, height: 7, backgroundColor: BRAND_LAVENDER },
  title: {
    marginTop: 24,
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -1.8,
    color: "#f4f6ff",
  },
  titleFont: { fontFamily: "BricolageGrotesque_800ExtraBold" },
  tagline: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 1.1,
    color: "rgba(225,231,255,.72)",
  },
  taglineFont: { fontFamily: "Inter_600SemiBold" },
  loadingArea: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 64,
  },
  loadingCopy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(225,231,255,.72)",
  },
  loadingFont: { fontFamily: "Inter_600SemiBold" },
  percentage: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: BRAND_CYAN,
  },
  percentageFont: { fontFamily: "Inter_700Bold" },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,.12)",
  },
  progress: {
    height: "100%",
    borderRadius: 5,
    overflow: "hidden",
  },
});
