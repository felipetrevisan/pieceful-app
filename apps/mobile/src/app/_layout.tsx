import "../global.css";

import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthGate } from "@/components/auth-gate";
import { AgeGate } from "@/components/age-gate";
import { FrostedScene } from "@/components/frosted-surface";
import { GuidedTour } from "@/components/guided-tour";
import { NavigationDrawer } from "@/components/navigation-drawer";
import { StartupSplash } from "@/components/startup-splash";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
import { AppProvider, useApp } from "@/state/app-provider";
import { SocialProvider, useSocial } from "@/state/social-provider";
import { MonetizationProvider } from "@/state/monetization-provider";

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { ageGateCompleted, ageGroup, ready, theme } = useApp();
  const { ready: socialReady, session } = useSocial();
  const colors = mobileThemes[theme];
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const finishStartup = useCallback(() => setShowStartupSplash(false), []);
  const guestChild = ageGroup === "child";
  const hasAppAccess = Boolean(session) || guestChild;

  return (
    <>
      <StatusBar style={!hasAppAccess ? "light" : isLightMobileTheme(theme) ? "dark" : "light"} />
      <FrostedScene overlays={hasAppAccess ? <NavigationDrawer /> : undefined}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="puzzle/[id]" />
          <Stack.Screen name="result/[id]" />
          <Stack.Screen name="settings/accessibility" />
          <Stack.Screen name="help/controller" />
          <Stack.Screen name="help/touch" />
        </Stack>
      </FrostedScene>
      {!ageGateCompleted && !showStartupSplash ? (
        <View style={styles.gate}>
          <AgeGate />
        </View>
      ) : null}
      {ageGateCompleted && !hasAppAccess && !showStartupSplash ? (
        <View style={styles.gate}>
          <AuthGate />
        </View>
      ) : null}
      {showStartupSplash ? (
        <View style={styles.gate}>
          <StartupSplash resourcesReady={ready && fontsLoaded && socialReady} fontsLoaded={fontsLoaded} onFinished={finishStartup} />
        </View>
      ) : null}
      {hasAppAccess && !showStartupSplash ? <GuidedTour /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <SocialProvider>
          <MonetizationProvider>
            <RootNavigator />
          </MonetizationProvider>
        </SocialProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gate: {
    position: "absolute",
    inset: 0,
    zIndex: 1000,
  },
});
