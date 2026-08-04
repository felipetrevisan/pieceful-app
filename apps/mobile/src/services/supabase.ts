import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import { secureAuthStorage } from "@/services/secure-auth-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        db: { schema: "pieceful" },
        auth: {
          storage: secureAuthStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;
