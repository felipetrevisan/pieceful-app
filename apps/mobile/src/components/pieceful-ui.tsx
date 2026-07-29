import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Children, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { ThemeParallaxBackground } from "@/components/theme-parallax-background";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export function Screen({
  children,
  parallax = false,
  scroll = true,
}: {
  children: ReactNode;
  parallax?: boolean;
  scroll?: boolean;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const content = (
    <View style={{ paddingHorizontal: 20, paddingBottom: 126, paddingTop: 8, flexGrow: 1 }}>
      {Children.map(children, (child, index) => (
        <Reveal delay={Math.min(index * 75, 375)}>{child}</Reveal>
      ))}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ThemeParallaxBackground scrollY={parallax ? scrollY : undefined} />
      {scroll ? (
        <Animated.ScrollView
          onScroll={parallax ? scrollHandler : undefined}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </Animated.ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { preferences } = useApp();
  return (
    <Animated.View
      entering={
        preferences.reducedMotion
          ? undefined
          : FadeInDown.delay(delay).duration(420).springify().damping(17)
      }
    >
      {children}
    </Animated.View>
  );
}

export function AppHeader({
  title,
  showTitle = false,
  back = false,
  showNotifications = true,
}: {
  title?: string;
  showTitle?: boolean;
  back?: boolean;
  showNotifications?: boolean;
}) {
  const { notificationCount, setDrawerOpen, t, theme } = useApp();
  const colors = mobileThemes[theme];
  if (back) {
    return (
      <View style={styles.backHeader}>
        <View style={styles.backHeaderActions}>
          <Pressable
            accessibilityLabel={t("Voltar para a tela anterior", "Back to previous screen")}
            accessibilityRole="button"
            android_ripple={{ color: `${colors.accent}24`, borderless: false }}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)" as never);
            }}
            style={[
              styles.visibleBackButton,
              { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}45` },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
            <Text style={[styles.visibleBackLabel, { color: colors.text }]}>{t("Voltar", "Back")}</Text>
          </Pressable>
          {showNotifications ? (
            <IconButton
              badge={notificationCount}
              round
              icon={notificationCount ? "notifications" : "notifications-outline"}
              label={t("Notificações", "Notifications")}
              onPress={() => router.push("/notifications" as never)}
            />
          ) : null}
        </View>
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
          style={[styles.backHeaderTitle, { color: colors.text }]}
        >
          {title}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.appHeader}>
      <View
        style={[
          styles.headerAvatar,
          { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}70` },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Abrir menu", "Open menu")}
          android_ripple={{ color: `${colors.accent}30`, radius: 24 }}
          hitSlop={8}
          onPress={() => setDrawerOpen(true)}
          style={styles.headerAvatarPressable}
        >
          <LinearGradient
            colors={[`${colors.accent}28`, `${colors.primary}38`]}
            style={StyleSheet.absoluteFill}
          />
          <Image
            accessibilityIgnoresInvertColors
            source={require("../../assets/images/pieceful-logo.png")}
            style={styles.headerLogo}
            contentFit="contain"
          />
        </Pressable>
      </View>
      <Text
        adjustsFontSizeToFit={showTitle}
        maxFontSizeMultiplier={1.2}
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[showTitle ? styles.headerTitle : styles.headerGreeting, { color: colors.text }]}
      >
        {title ?? t("Boa noite", "Good evening")}
      </Text>
      {showNotifications ? (
        <IconButton
          badge={notificationCount}
          round
          icon={notificationCount ? "notifications" : "notifications-outline"}
          label={t("Notificações", "Notifications")}
          onPress={() => router.push("/notifications" as never)}
        />
      ) : (
        <View style={styles.headerActionSpacer} />
      )}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={styles.sectionHeader}>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
        style={[styles.sectionTitle, { color: colors.text }]}
      >
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.sectionAction, { color: colors.accent }]}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.panelAlt }]}>
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%` }]}
      />
    </View>
  );
}

export function BrandHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View className="mb-6 gap-2">
      <View className="flex-row items-center gap-2">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.panelAlt }}
        >
          <Ionicons name="extension-puzzle" size={20} color={colors.accent} />
        </View>
        <Text className="text-xs font-black tracking-[3px]" style={{ color: colors.accent }}>
          {eyebrow}
        </Text>
      </View>
      <Text
        className="text-4xl tracking-tight"
        style={{ color: colors.text, fontFamily: "BricolageGrotesque_800ExtraBold" }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className="text-base leading-6"
          style={{ color: colors.muted, fontFamily: "Inter_400Regular" }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  className = "",
  style,
  ...props
}: ViewProps & { children: ReactNode; className?: string }) {
  const { preferences, theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View
      className={`rounded-[24px] border p-5 ${className}`}
      style={[
        {
          backgroundColor: "transparent",
          borderColor: `${colors.accent}${preferences.highContrast ? "aa" : "32"}`,
          borderRadius: colors.radius,
          borderWidth: preferences.highContrast ? 2 : 1,
          overflow: "hidden",
        },
        style,
      ]}
      {...props}
    >
      <FrostedBackdrop intensity={52} />
      {children}
    </View>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: Omit<ActionButtonProps, "variant">) {
  return (
    <ActionButton variant="primary" className={className} {...props}>
      {children}
    </ActionButton>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: Omit<ActionButtonProps, "variant">) {
  return (
    <ActionButton variant="secondary" className={className} {...props}>
      {children}
    </ActionButton>
  );
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
  onPressIn,
  onPressOut,
  style,
  variant = "primary",
  ...props
}: ActionButtonProps) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const buttonRadius = Math.max(5, Math.min(20, colors.radius - 5));
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glass = hasLiquidGlass() && !disabled;
  const labelColor =
    variant === "primary" && !glass
      ? "#17102d"
      : variant === "danger"
        ? colors.danger
        : colors.text;
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={20} color={labelColor} /> : null}
      {typeof children === "string" ? (
        <Text numberOfLines={1} style={[styles.buttonLabel, { color: labelColor }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  return (
    <Animated.View
      className={className}
      style={[
        styles.buttonShell,
        { borderRadius: buttonRadius },
        !glass && disabled ? styles.disabled : null,
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        android_ripple={
          Platform.OS === "android"
            ? { color: `${colors.text}24`, borderless: false, foreground: true }
            : undefined
        }
        onPressIn={(event) => {
          scale.set(withSpring(0.96, { damping: 15, stiffness: 280 }));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.set(withSpring(1, { damping: 12, stiffness: 240 }));
          onPressOut?.(event);
        }}
        style={(state) => [
          styles.buttonPressable,
          typeof style === "function" ? style(state) : style,
        ]}
        {...props}
      >
        {glass ? (
          <GlassView
            glassEffectStyle={variant === "primary" ? "regular" : "clear"}
            isInteractive
            colorScheme={isLightMobileTheme(theme) ? "light" : "dark"}
            tintColor={
              variant === "danger"
                ? `${colors.danger}55`
                : variant === "primary"
                  ? `${colors.primary}72`
                  : `${colors.panelAlt}66`
            }
            style={[styles.buttonContent, { borderRadius: buttonRadius }]}
          >
            {content}
          </GlassView>
        ) : variant === "primary" ? (
          <LinearGradient
            colors={[...colors.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.buttonContent, { borderRadius: buttonRadius }]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.buttonContent,
              styles.outlinedButton,
              { borderRadius: buttonRadius },
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
    </Animated.View>
  );
}

export function IconButton({
  badge = 0,
  icon,
  label,
  onPressIn,
  onPressOut,
  round = false,
  tone = "default",
  style,
  ...props
}: Omit<PressableProps, "children"> & {
  badge?: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  round?: boolean;
  tone?: "default" | "danger";
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const glass = hasLiquidGlass() && !props.disabled;
  const iconColor = tone === "danger" ? colors.danger : colors.accent;
  const iconRadius = round ? 24 : Math.max(5, Math.min(16, colors.radius - 7));
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.iconButtonShell, { borderRadius: iconRadius }, animatedStyle]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        android_ripple={
          Platform.OS === "android"
            ? { color: `${colors.text}24`, borderless: false, foreground: true }
            : undefined
        }
        onPressIn={(event) => {
          scale.set(withSpring(0.9, { damping: 14, stiffness: 300 }));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.set(withSpring(1, { damping: 11, stiffness: 250 }));
          onPressOut?.(event);
        }}
        style={(state) => [
          styles.iconButtonPressable,
          typeof style === "function" ? style(state) : style,
        ]}
        {...props}
      >
        {glass ? (
          <GlassView
            glassEffectStyle="clear"
            isInteractive
            colorScheme={isLightMobileTheme(theme) ? "light" : "dark"}
            tintColor={tone === "danger" ? `${colors.danger}45` : `${colors.panelAlt}66`}
            style={[styles.iconButtonContent, { borderRadius: iconRadius }]}
          >
            <Ionicons name={icon} size={21} color={iconColor} />
            {badge > 0 ? (
              <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.iconBadgeText, { color: colors.background }]}>
                  {Math.min(9, badge)}
                </Text>
              </View>
            ) : null}
          </GlassView>
        ) : (
          <View
            style={[
              styles.iconButtonContent,
              {
                borderRadius: iconRadius,
                backgroundColor: colors.panelAlt,
                borderColor: tone === "danger" ? `${colors.danger}55` : `${colors.accent}38`,
              },
            ]}
          >
            <Ionicons name={icon} size={21} color={iconColor} />
            {badge > 0 ? (
              <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.iconBadgeText, { color: colors.background }]}>
                  {Math.min(9, badge)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
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
    <Text
      className={`text-sm font-bold ${className}`}
      style={{ color: mobileThemes[theme].text }}
      {...props}
    >
      {children}
    </Text>
  );
}

export function MutedText({
  children,
  className = "",
  ...props
}: TextProps & { className?: string }) {
  const { theme } = useApp();
  return (
    <Text
      className={`text-sm leading-5 ${className}`}
      style={{ color: mobileThemes[theme].muted }}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  headerActionSpacer: { width: 48, height: 48 },
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
  buttonPressable: { flex: 1 },
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
    position: "relative",
    width: 48,
  },
  iconBadge: {
    position: "absolute",
    right: 4,
    top: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  iconBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    lineHeight: 11,
  },
  iconButtonPressable: { flex: 1 },
  appHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  backHeader: { width: "100%", marginBottom: 22, gap: 12 },
  backHeaderActions: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backHeaderTitle: {
    width: "100%",
    fontFamily: "BricolageGrotesque_800ExtraBold",
    fontSize: 29,
    lineHeight: 34,
  },
  visibleBackButton: {
    minWidth: 84,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 9,
    overflow: "hidden",
  },
  visibleBackLabel: { fontFamily: "Inter_700Bold", fontSize: 12 },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  headerAvatarPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: { width: 37, height: 37 },
  headerGreeting: { flex: 1, fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 },
  headerTitle: {
    flex: 1,
    fontFamily: "BricolageGrotesque_800ExtraBold",
    fontSize: 27,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    flexShrink: 1,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 22,
    paddingRight: 6,
  },
  sectionAction: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1, marginLeft: 12 },
  progressTrack: { height: 7, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
});
