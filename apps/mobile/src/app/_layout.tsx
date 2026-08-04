import "../global.css";

import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AgeGate } from "@/components/age-gate";
import { AppUpdateNotice } from "@/components/app-update-notice";
import { AuthGate } from "@/components/auth-gate";
import { FrostedScene } from "@/components/frosted-surface";
import { GuidedTour } from "@/components/guided-tour";
import { NavigationDrawer } from "@/components/navigation-drawer";
import { PiecefulAlertProvider } from "@/components/pieceful-alert";
import { StartupSplash } from "@/components/startup-splash";
import { isLightMobileTheme, mobileThemes } from "@/constants/pieceful-theme";
import { reportInsecureAuthCallbackIfNeeded } from "@/services/social-auth";
import { AppProvider, useApp } from "@/state/app-provider";
import { CreateFlowProvider } from "@/state/create-flow-provider";
import { MonetizationProvider } from "@/state/monetization-provider";
import { SocialProvider, useSocial } from "@/state/social-provider";

void SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  release: process.env.EXPO_PUBLIC_APP_RELEASE,
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
});
reportInsecureAuthCallbackIfNeeded();

function RootNavigator() {
  const { ageGateCompleted, ageGroup, ready, theme } = useApp();
  const { devAccess, ready: socialReady, session } = useSocial();
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
  const hasAppAccess = Boolean(session) || devAccess || guestChild;

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
          <Stack.Screen name="create/difficulty" />
          <Stack.Screen name="create/options" />
          <Stack.Screen name="puzzle/[id]" />
          <Stack.Screen name="result/[id]" />
          <Stack.Screen name="notifications" />
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
          <StartupSplash
            resourcesReady={ready && fontsLoaded && socialReady}
            fontsLoaded={fontsLoaded}
            onFinished={finishStartup}
          />
        </View>
      ) : null}
      {hasAppAccess && !showStartupSplash ? <GuidedTour /> : null}
      <AppUpdateNotice enabled={hasAppAccess && !showStartupSplash} />
    </>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <PiecefulAlertProvider>
          <SocialProvider>
            <MonetizationProvider>
              <CreateFlowProvider>
                <RootNavigator />
              </CreateFlowProvider>
            </MonetizationProvider>
          </SocialProvider>
        </PiecefulAlertProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  gate: {
    position: "absolute",
    inset: 0,
    zIndex: 1000,
  },
});
