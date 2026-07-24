import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { type DimensionValue, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "@/state/app-provider";

const STARS = [
  { left: "8%", top: "11%", size: 2, delay: 120 },
  { left: "19%", top: "24%", size: 3, delay: 720 },
  { left: "31%", top: "8%", size: 2, delay: 1350 },
  { left: "43%", top: "19%", size: 2, delay: 390 },
  { left: "56%", top: "7%", size: 3, delay: 980 },
  { left: "70%", top: "26%", size: 2, delay: 1600 },
  { left: "87%", top: "13%", size: 3, delay: 520 },
  { left: "12%", top: "39%", size: 2, delay: 1880 },
  { left: "26%", top: "51%", size: 3, delay: 250 },
  { left: "48%", top: "43%", size: 2, delay: 1100 },
  { left: "64%", top: "55%", size: 2, delay: 1760 },
  { left: "83%", top: "46%", size: 3, delay: 850 },
  { left: "7%", top: "67%", size: 3, delay: 1450 },
  { left: "37%", top: "73%", size: 2, delay: 630 },
  { left: "59%", top: "66%", size: 3, delay: 2020 },
  { left: "91%", top: "72%", size: 2, delay: 320 },
  { left: "17%", top: "88%", size: 2, delay: 1240 },
  { left: "76%", top: "86%", size: 3, delay: 80 },
] as const;

export function AnimatedAuroraBackground({ strongOverlay = false }: { strongOverlay?: boolean }) {
  const { preferences } = useApp();
  const drift = useSharedValue(0);
  const aurora = useSharedValue(0);

  useEffect(() => {
    if (preferences.reducedMotion) {
      drift.set(0.35);
      aurora.set(0.3);
      return;
    }
    drift.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 9200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 9200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    aurora.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 6800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 6800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(drift);
      cancelAnimation(aurora);
    };
  }, [aurora, drift, preferences.reducedMotion]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -14 + drift.get() * 28 },
      { translateY: -24 + drift.get() * 48 },
      { scale: 1.1 + drift.get() * 0.035 },
    ],
  }));
  const cyanStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + aurora.get() * 0.22,
    transform: [
      { translateX: -70 + aurora.get() * 105 },
      { translateY: 10 - aurora.get() * 75 },
      { rotate: `${-21 + aurora.get() * 9}deg` },
      { scaleX: 0.9 + aurora.get() * 0.22 },
    ],
  }));
  const violetStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + (1 - aurora.get()) * 0.2,
    transform: [
      { translateX: 65 - aurora.get() * 120 },
      { translateY: -35 + aurora.get() * 95 },
      { rotate: `${24 - aurora.get() * 12}deg` },
      { scaleY: 0.9 + aurora.get() * 0.18 },
    ],
  }));

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.Image
        source={require("../../assets/images/splash-background.png")}
        resizeMode="cover"
        style={[styles.backgroundImage, imageStyle]}
      />
      <Animated.View style={[styles.auroraBand, styles.cyanBand, cyanStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(70,255,224,.5)", "rgba(73,178,255,.2)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.auroraBand, styles.violetBand, violetStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(159,116,255,.48)", "rgba(69,221,255,.18)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {!preferences.reducedMotion
        ? STARS.map((star) => <TwinkleStar key={`${star.left}-${star.top}`} {...star} />)
        : null}
      <LinearGradient
        colors={
          strongOverlay
            ? ["rgba(4,9,28,.15)", "rgba(4,9,28,.68)", "#05091a"]
            : ["rgba(4,10,28,.13)", "rgba(4,10,28,.4)", "rgba(4,10,28,.8)"]
        }
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function TwinkleStar({
  delay,
  left,
  size,
  top,
}: {
  delay: number;
  left: DimensionValue;
  size: number;
  top: DimensionValue;
}) {
  const pulse = useSharedValue(0.15);
  useEffect(() => {
    pulse.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 650 + delay * 0.18 }),
            withTiming(0.12, { duration: 900 + delay * 0.12 }),
          ),
          -1,
          true,
        ),
      ),
    );
    return () => cancelAnimation(pulse);
  }, [delay, pulse]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.get(),
    transform: [{ scale: 0.65 + pulse.get() * 0.85 }, { rotate: "45deg" }],
  }));
  return (
    <Animated.View
      style={[
        styles.star,
        { left, top, width: size, height: size, borderRadius: size / 3 },
        animatedStyle,
      ]}
    />
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
  backgroundImage: {
    position: "absolute",
    left: -45,
    right: -45,
    top: -70,
    bottom: -70,
    width: undefined,
    height: undefined,
  },
  auroraBand: {
    position: "absolute",
    width: 235,
    height: "115%",
    borderRadius: 130,
    overflow: "hidden",
  },
  cyanBand: { left: "8%", top: "-8%" },
  violetBand: { right: "4%", top: "-12%" },
  star: {
    position: "absolute",
    backgroundColor: "#f5fbff",
    shadowColor: "#8ffaff",
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
});
