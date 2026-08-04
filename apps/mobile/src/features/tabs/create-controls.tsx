import { Ionicons } from "@expo/vector-icons";
import {
  DIFFICULTIES,
  orientPuzzleGrid,
  type PuzzleDifficulty,
  type resolvePuzzleOrientation,
} from "@puzzled/shared";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Card, Label, MutedText } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";
import { styles } from "./create.styles";

const presets = DIFFICULTIES;
const difficultyLabels: Record<PuzzleDifficulty, [string, string]> = {
  beginner: ["Iniciante", "Beginner"],
  easy: ["Fácil", "Easy"],
  normal: ["Normal", "Normal"],
  medium: ["Médio", "Medium"],
  hard: ["Difícil", "Hard"],
  advanced: ["Avançado", "Advanced"],
  master: ["Mestre", "Master"],
  legendary: ["Lendário", "Legendary"],
  custom: ["Personalizado", "Custom"],
};

export function CollapsibleStepCard({
  children,
  expanded,
  onToggle,
  step,
  subtitle,
  title,
}: {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  step: string;
  subtitle: string;
  title: string;
}) {
  const { preferences, theme } = useApp();
  const colors = mobileThemes[theme];
  const chevronProgress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    chevronProgress.set(
      preferences.reducedMotion
        ? expanded
          ? 1
          : 0
        : withTiming(expanded ? 1 : 0, { duration: 220 }),
    );
  }, [chevronProgress, expanded, preferences.reducedMotion]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronProgress.value * 180}deg` }],
  }));

  return (
    <Animated.View
      layout={
        preferences.reducedMotion
          ? undefined
          : LinearTransition.springify().damping(18).stiffness(180)
      }
      style={styles.stepCardWrap}
    >
      <Card style={styles.collapsibleCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title}. ${subtitle}`}
          android_ripple={{ color: `${colors.accent}18` }}
          onPress={onToggle}
          style={styles.stepHeader}
        >
          <View style={[styles.stepNumber, { backgroundColor: colors.panelAlt }]}>
            <Text style={[styles.stepNumberText, { color: colors.accent }]}>{step}</Text>
          </View>
          <View style={styles.stepHeadingCopy}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
            <Text numberOfLines={2} style={[styles.stepSubtitle, { color: colors.muted }]}>
              {subtitle}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.stepChevron,
              { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}35` },
              chevronStyle,
            ]}
          >
            <Ionicons name="chevron-down" size={20} color={colors.accent} />
          </Animated.View>
        </Pressable>

        {expanded ? (
          <Animated.View
            entering={preferences.reducedMotion ? undefined : FadeIn.duration(220)}
            exiting={preferences.reducedMotion ? undefined : FadeOut.duration(150)}
            style={styles.stepContent}
          >
            {children}
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

export function DifficultySlider({
  selectedIndex,
  orientation,
  onSelect,
}: {
  selectedIndex: number;
  orientation: ReturnType<typeof resolvePuzzleOrientation>;
  onSelect: (index: number) => void;
}) {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const preset = presets[selectedIndex] ?? presets[0];
  const displayGrid = orientPuzzleGrid(preset.rows, preset.columns, orientation);
  const [ptLabel, enLabel] = difficultyLabels[preset.id];
  const [sliderWidth, setSliderWidth] = useState(0);
  const thumbX = useSharedValue(0);
  const maxIndex = presets.length - 1;

  useEffect(() => {
    if (sliderWidth > 0) {
      thumbX.set(
        withSpring((selectedIndex / maxIndex) * (sliderWidth - 32), {
          damping: 16,
          stiffness: 210,
        }),
      );
    }
  }, [maxIndex, selectedIndex, sliderWidth, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const usableWidth = Math.max(1, sliderWidth - 32);
  const panGesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      thumbX.set(Math.max(0, Math.min(usableWidth, event.x - 16)));
    })
    .onEnd(() => {
      const next = Math.round((thumbX.value / usableWidth) * maxIndex);
      thumbX.set(withSpring((next / maxIndex) * usableWidth, { damping: 15, stiffness: 240 }));
      runOnJS(onSelect)(next);
    });
  const tapGesture = Gesture.Tap().onEnd((event) => {
    const next = Math.round(
      (Math.max(0, Math.min(usableWidth, event.x - 16)) / usableWidth) * maxIndex,
    );
    thumbX.set(withSpring((next / maxIndex) * usableWidth, { damping: 15, stiffness: 240 }));
    runOnJS(onSelect)(next);
  });
  const sliderGesture = Gesture.Race(panGesture, tapGesture);

  function adjust(direction: -1 | 1) {
    onSelect(Math.max(0, Math.min(maxIndex, selectedIndex + direction)));
  }

  return (
    <View style={{ gap: 12 }}>
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.difficultyHero}
      >
        <View style={styles.difficultyHeroIcon}>
          <Ionicons name="speedometer-outline" size={25} color="#08111f" />
        </View>
        <View style={styles.difficultyHeroCopy}>
          <Text numberOfLines={1} style={styles.difficultyHeroLabel}>
            {t(ptLabel, enLabel)}
          </Text>
          <Text style={styles.difficultyHeroMeta}>
            {displayGrid.rows} × {displayGrid.columns} ·{" "}
            {String(selectedIndex + 1).padStart(2, "0")}/{String(presets.length).padStart(2, "0")}
          </Text>
        </View>
        <View>
          <Text style={styles.difficultyHeroCount}>{preset.pieces}</Text>
          <Text style={styles.difficultyHeroUnit}>{t("PEÇAS", "PIECES")}</Text>
        </View>
      </LinearGradient>

      <GestureDetector gesture={sliderGesture}>
        <Animated.View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("Dificuldade do quebra-cabeça", "Puzzle difficulty")}
          accessibilityValue={{
            min: 1,
            max: presets.length,
            now: selectedIndex + 1,
            text: `${t(ptLabel, enLabel)}, ${preset.pieces} ${t("peças", "pieces")}`,
          }}
          accessibilityActions={[
            { name: "increment", label: t("Aumentar dificuldade", "Increase difficulty") },
            { name: "decrement", label: t("Diminuir dificuldade", "Decrease difficulty") },
          ]}
          onAccessibilityAction={(event) =>
            adjust(event.nativeEvent.actionName === "increment" ? 1 : -1)
          }
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
          style={styles.slider}
        >
          <View style={[styles.sliderLine, { backgroundColor: `${colors.muted}38` }]} />
          <View pointerEvents="none" style={styles.sliderMarks}>
            {presets.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.sliderMark,
                  {
                    backgroundColor: index <= selectedIndex ? colors.accent : colors.panelAlt,
                    borderColor: index === selectedIndex ? colors.primary : colors.panel,
                  },
                ]}
              />
            ))}
          </View>
          <Animated.View pointerEvents="none" style={[styles.sliderThumb, thumbStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.sliderThumbInner}
            >
              <Ionicons name="sparkles" size={13} color="#08111f" />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.sliderFooter}>
        <Text style={[styles.sliderEndpoint, { color: colors.muted }]}>12</Text>
        <Text style={[styles.sliderHint, { color: colors.accent }]}>
          {t("ARRASTE PARA AJUSTAR", "DRAG TO ADJUST")}
        </Text>
        <Text style={[styles.sliderEndpoint, { color: colors.muted }]}>1000</Text>
      </View>
    </View>
  );
}

export function OptionRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: () => void;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View
      className="min-h-[76px] flex-row items-center gap-3 border-b py-3"
      style={{ borderBottomColor: `${colors.accent}16` }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: colors.panelAlt }}
      >
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>
      <View className="flex-1">
        <Label>{title}</Label>
        <MutedText>{subtitle}</MutedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.panelAlt, true: `${colors.accent}99` }}
        thumbColor={value ? colors.accent : colors.muted}
      />
    </View>
  );
}
