import { Ionicons } from "@expo/vector-icons";
import {
  DIFFICULTIES,
  orientPuzzleGrid,
  type PuzzleDifficulty,
  type resolvePuzzleOrientation,
} from "@puzzled/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Label, MutedText } from "@/components/pieceful-ui";
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
  mythic: ["Mítico", "Mythic"],
  custom: ["Personalizado", "Custom"],
};

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
        <Text style={[styles.sliderEndpoint, { color: colors.muted }]}>{presets[0].pieces}</Text>
        <Text style={[styles.sliderHint, { color: colors.accent }]}>
          {t("ARRASTE PARA AJUSTAR", "DRAG TO ADJUST")}
        </Text>
        <Text style={[styles.sliderEndpoint, { color: colors.muted }]}>
          {presets[presets.length - 1].pieces}
        </Text>
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
