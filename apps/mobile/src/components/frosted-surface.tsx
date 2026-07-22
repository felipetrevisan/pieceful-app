import { BlurTargetView, BlurView } from "expo-blur";
import { createContext, type ReactNode, type RefObject, useContext, useRef } from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function FrostedScene({ children, overlays }: { children: ReactNode; overlays?: ReactNode }) {
  const blurTarget = useRef<View>(null);
  if (Platform.OS === "android") {
    return (
      <BlurTargetContext.Provider value={null}>
        <View style={styles.scene}>{children}</View>
        {overlays}
      </BlurTargetContext.Provider>
    );
  }
  return (
    <BlurTargetContext.Provider value={blurTarget}>
      <BlurTargetView ref={blurTarget} style={styles.scene}>{children}</BlurTargetView>
      {overlays}
    </BlurTargetContext.Provider>
  );
}

export function FrostedBackdrop({ intensity = 58, style }: { intensity?: number; style?: ViewProps["style"] }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  const blurTarget = useContext(BlurTargetContext);
  const light = isLightMobileTheme(theme);

  return (
    <>
      {Platform.OS !== "android" ? (
        <BlurView
          blurTarget={blurTarget ?? undefined}
          blurReductionFactor={3}
          intensity={intensity}
          tint={light ? "systemThinMaterialLight" : "systemThinMaterialDark"}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, style]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: light ? `${colors.panel}48` : `${colors.panel}78` },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
});
