import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSocial } from "@/state/social-provider";

/**
 * Landing route for native OAuth deep links (`pieceful://auth/callback`).
 * The social provider exchanges the authorization code even when Android starts
 * a fresh app process. Keep this route mounted until that session is available.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session } = useSocial();

  useEffect(() => {
    if (session) router.replace("/(tabs)");
  }, [router, session]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#63edf2" size="large" />
      <Text style={styles.label}>Concluindo login…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#05091a",
  },
  label: {
    color: "#dfe7ff",
    fontSize: 15,
    fontWeight: "600",
  },
});
