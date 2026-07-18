import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  ScrollView,
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
  const content = <View className="px-5 pb-32 pt-3">{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
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
      <Text className="text-4xl font-black tracking-tight" style={{ color: colors.text }}>
        {title}
      </Text>
      {description ? (
        <Text className="text-base leading-6" style={{ color: colors.muted }}>
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
      style={[{ backgroundColor: colors.panel, borderColor: `${colors.accent}26` }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({ children, className = "", ...props }: PressableProps & { children: ReactNode; className?: string }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <Pressable className={`overflow-hidden rounded-2xl active:scale-[0.98] ${className}`} {...props}>
      <LinearGradient colors={[...colors.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="min-h-14 flex-row items-center justify-center gap-2 px-5">
        {typeof children === "string" ? <Text className="text-base font-black text-[#17102d]">{children}</Text> : children}
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ children, className = "", ...props }: PressableProps & { children: ReactNode; className?: string }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <Pressable
      className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border px-5 active:scale-[0.98] ${className}`}
      style={{ backgroundColor: colors.panelAlt, borderColor: `${colors.accent}45` }}
      {...props}
    >
      {typeof children === "string" ? <Text className="text-base font-bold" style={{ color: colors.text }}>{children}</Text> : children}
    </Pressable>
  );
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
