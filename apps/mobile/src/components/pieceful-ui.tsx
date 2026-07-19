import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const content = <View style={{ paddingHorizontal: 20, paddingBottom: 126, paddingTop: 8, flexGrow: 1 }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <LinearGradient colors={[`${colors.primary}12`, "transparent", `${colors.accent}08`]} style={StyleSheet.absoluteFill} />
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function AppHeader({ title, showTitle = false }: { title?: string; showTitle?: boolean }) {
  const { setDrawerOpen, t, theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={styles.appHeader}>
      <Pressable accessibilityLabel={t("Abrir menu", "Open menu")} onPress={() => setDrawerOpen(true)} style={({ pressed }) => [styles.headerAvatar, { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}45`, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="extension-puzzle" size={23} color={colors.accent} />
      </Pressable>
      <Text numberOfLines={1} style={[showTitle ? styles.headerTitle : styles.headerGreeting, { color: colors.text }]}>{title ?? t("Boa noite", "Good evening")}</Text>
      <IconButton icon="notifications-outline" label={t("Notificações", "Notifications")} />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={[styles.sectionAction, { color: colors.accent }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return <View style={[styles.progressTrack, { backgroundColor: colors.panelAlt }]}><LinearGradient colors={[colors.accent, colors.primary]} style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} /></View>;
}

export function BrandHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View className="mb-6 gap-2">
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.panelAlt }}>
          <Ionicons name="extension-puzzle" size={20} color={colors.accent} />
        </View>
        <Text className="text-xs font-black tracking-[3px]" style={{ color: colors.accent }}>
          {eyebrow}
        </Text>
      </View>
      <Text className="text-4xl tracking-tight" style={{ color: colors.text, fontFamily: "BricolageGrotesque_800ExtraBold" }}>
        {title}
      </Text>
      {description ? (
        <Text className="text-base leading-6" style={{ color: colors.muted, fontFamily: "Inter_400Regular" }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ children, className = "", style, ...props }: ViewProps & { children: ReactNode; className?: string }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View
      className={`rounded-[24px] border p-5 ${className}`}
      style={[{ backgroundColor: `${colors.panel}e8`, borderColor: `${colors.accent}26` }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({ children, className = "", ...props }: Omit<ActionButtonProps, "variant">) {
  return <ActionButton variant="primary" className={className} {...props}>{children}</ActionButton>;
}

export function SecondaryButton({ children, className = "", ...props }: Omit<ActionButtonProps, "variant">) {
  return <ActionButton variant="secondary" className={className} {...props}>{children}</ActionButton>;
}

type ActionButtonProps = PressableProps & {
  children: ReactNode;
  className?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "danger";
};

export function ActionButton({
  children,
  className = "",
  disabled,
  icon,
  style,
  variant = "primary",
  ...props
}: ActionButtonProps) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const glass = hasLiquidGlass() && !disabled;
  const labelColor = variant === "primary" && !glass ? "#17102d" : variant === "danger" ? colors.danger : colors.text;
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={20} color={labelColor} /> : null}
      {typeof children === "string" ? (
        <Text numberOfLines={1} style={[styles.buttonLabel, { color: labelColor }]}>{children}</Text>
      ) : children}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      className={className}
      disabled={disabled}
      android_ripple={Platform.OS === "android" ? { color: `${colors.text}24`, borderless: false, foreground: true } : undefined}
      style={(state) => [
        styles.buttonShell,
        !glass && disabled ? styles.disabled : null,
        state.pressed ? styles.pressed : null,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {glass ? (
        <GlassView
          glassEffectStyle={variant === "primary" ? "regular" : "clear"}
          isInteractive
          colorScheme={theme === "candy" ? "light" : "dark"}
          tintColor={variant === "danger" ? `${colors.danger}55` : variant === "primary" ? `${colors.primary}72` : `${colors.panelAlt}66`}
          style={styles.buttonContent}
        >
          {content}
        </GlassView>
      ) : variant === "primary" ? (
        <LinearGradient
          colors={[...colors.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonContent}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.buttonContent,
            styles.outlinedButton,
            {
              backgroundColor: variant === "danger" ? `${colors.danger}14` : colors.panelAlt,
              borderColor: variant === "danger" ? `${colors.danger}66` : `${colors.accent}45`,
            },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  tone = "default",
  style,
  ...props
}: Omit<PressableProps, "children"> & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "default" | "danger";
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const glass = hasLiquidGlass() && !props.disabled;
  const iconColor = tone === "danger" ? colors.danger : colors.accent;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={Platform.OS === "android" ? { color: `${colors.text}24`, borderless: false, foreground: true } : undefined}
      style={(state) => [styles.iconButtonShell, state.pressed ? styles.pressed : null, typeof style === "function" ? style(state) : style]}
      {...props}
    >
      {glass ? (
        <GlassView
          glassEffectStyle="clear"
          isInteractive
          colorScheme={theme === "candy" ? "light" : "dark"}
          tintColor={tone === "danger" ? `${colors.danger}45` : `${colors.panelAlt}66`}
          style={styles.iconButtonContent}
        >
          <Ionicons name={icon} size={21} color={iconColor} />
        </GlassView>
      ) : (
        <View style={[styles.iconButtonContent, { backgroundColor: colors.panelAlt, borderColor: tone === "danger" ? `${colors.danger}55` : `${colors.accent}38` }]}>
          <Ionicons name={icon} size={21} color={iconColor} />
        </View>
      )}
    </Pressable>
  );
}

function hasLiquidGlass() {
  if (Platform.OS !== "ios") return false;
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

export function Label({ children, className = "", ...props }: TextProps & { className?: string }) {
  const { theme } = useApp();
  return (
    <Text className={`text-sm font-bold ${className}`} style={{ color: mobileThemes[theme].text }} {...props}>
      {children}
    </Text>
  );
}

export function MutedText({ children, className = "", ...props }: TextProps & { className?: string }) {
  const { theme } = useApp();
  return (
    <Text className={`text-sm leading-5 ${className}`} style={{ color: mobileThemes[theme].muted }} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  buttonShell: {
    alignSelf: "stretch",
    borderRadius: 18,
    minHeight: 58,
    overflow: "hidden",
    width: "100%",
  },
  buttonContent: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 20,
    width: "100%",
  },
  buttonLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  outlinedButton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    transform: [{ scale: 0.975 }],
  },
  disabled: {
    opacity: 0.42,
  },
  iconButtonShell: {
    borderRadius: 16,
    height: 48,
    overflow: "hidden",
    width: 48,
  },
  iconButtonContent: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  appHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  headerAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerGreeting: { flex: 1, fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 },
  headerTitle: { flex: 1, fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 27, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 22 },
  sectionAction: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  progressTrack: { height: 7, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
});
