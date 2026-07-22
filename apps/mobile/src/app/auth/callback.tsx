import { Redirect } from "expo-router";

/**
 * Landing route for native OAuth deep links (`pieceful://auth/callback`).
 * The social provider exchanges the authorization code and owns the session;
 * this screen only prevents Expo Router from treating the callback as a page.
 */
export default function AuthCallbackScreen() {
  return <Redirect href="/(tabs)" />;
}
