import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authenticateGamePlatform, reportPlatformAchievement } from "@/services/game-platform";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import { useApp } from "@/state/app-provider";

WebBrowser.maybeCompleteAuthSession();

export interface PlayerProfile {
  id: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  xp: number;
}

export interface FriendProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  online: boolean;
}

interface SocialState {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  profile: PlayerProfile;
  friends: FriendProfile[];
  busy: boolean;
  error: string | null;
  signIn: (provider: "google" | "azure") => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (input: Pick<PlayerProfile, "displayName" | "avatarUrl" | "bio">) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
  refreshFriends: () => Promise<void>;
}

const PROFILE_KEY = "pieceful-mobile-profile-v1";
const NATIVE_AUTH_CALLBACK = "pieceful://auth/callback";
const OAUTH_TIMEOUT_MS = 90_000;

async function openAuthSession(url: string, redirectTo: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      WebBrowser.openAuthSessionAsync(url, redirectTo),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("AUTH_TIMEOUT")), OAUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const fallbackProfile: PlayerProfile = {
  id: null,
  displayName: "Player One",
  avatarUrl: null,
  bio: "One piece at a time.",
  xp: 0,
};

const SocialContext = createContext<SocialState | null>(null);
const uploadedPuzzleImages = new Map<string, string>();

function isRemotePuzzleSafe(row: Record<string, unknown>) {
  const configuration = row.configuration as Record<string, unknown> | null;
  const session = row.session as Record<string, unknown> | null;
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.image_uri !== "string" ||
    !configuration ||
    !session ||
    !Array.isArray(session.pieces) ||
    session.pieces.length === 0
  )
    return false;

  const rows = Number(configuration.rows);
  const columns = Number(configuration.columns);
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows <= 0 || columns <= 0)
    return false;

  return session.pieces.every((piece) => {
    if (!piece || typeof piece !== "object") return false;
    const candidate = piece as Record<string, unknown>;
    const current = candidate.currentPosition as Record<string, unknown> | null;
    const correct = candidate.correctPosition as Record<string, unknown> | null;
    return (
      typeof candidate.id === "string" &&
      current !== null &&
      correct !== null &&
      Number.isFinite(Number(current.x)) &&
      Number.isFinite(Number(current.y)) &&
      Number.isFinite(Number(current.rotation)) &&
      Number.isFinite(Number(correct.x)) &&
      Number.isFinite(Number(correct.y)) &&
      Number.isFinite(Number(correct.rotation))
    );
  });
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { ageGroup, mergeRemotePuzzles, puzzles, t } = useApp();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile>(fallbackProfile);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = puzzles.filter((puzzle) => puzzle.session.completedAt).length;
  const placed = puzzles.reduce(
    (sum, puzzle) => sum + puzzle.session.pieces.filter((piece) => piece.isPlaced).length,
    0,
  );
  const xp = completed * 500 + placed;

  const loadRemoteProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      const client = supabase;
      const { data } = await client
        .from("profiles")
        .select("id, display_name, avatar_url, bio, xp")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return;
      const next: PlayerProfile = {
        id: data.id,
        displayName: data.display_name || "Player One",
        avatarUrl: data.avatar_url,
        bio: data.bio || "One piece at a time.",
        xp: data.xp || 0,
      };
      setProfile(next);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      const { data: remotePuzzles } = await client
        .from("puzzles")
        .select(
          "id, name, difficulty, configuration, session, image_uri, completed_at, created_at, updated_at",
        )
        .eq("user_id", userId);
      if (remotePuzzles) {
        const resolved = await Promise.all(
          remotePuzzles.flatMap((row) => {
            if (!isRemotePuzzleSafe(row)) return [];
            return [
              (async () => {
                let imageUri = row.image_uri;
                if (!imageUri.startsWith("http")) {
                  const { data: signedImage } = await client.storage
                    .from("puzzle-images")
                    .createSignedUrl(imageUri, 60 * 60 * 24);
                  if (!signedImage?.signedUrl) return null;
                  imageUri = signedImage.signedUrl;
                  uploadedPuzzleImages.set(row.id, row.image_uri);
                }
                return {
                  id: row.id,
                  name: row.name,
                  imageUri,
                  difficulty: row.difficulty,
                  configuration: row.configuration,
                  session: {
                    ...row.session,
                    completedAt: row.completed_at ?? row.session.completedAt,
                  },
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
                };
              })(),
            ];
          }),
        );
        mergeRemotePuzzles(resolved.filter((puzzle) => puzzle !== null));
      }
    },
    [mergeRemotePuzzles],
  );

  useEffect(() => {
    if (!ageGroup || ageGroup === "child") {
      void Promise.resolve().then(() => {
        setSession(null);
        setFriends([]);
        setReady(true);
      });
      if (ageGroup === "child") void supabase?.auth.signOut({ scope: "local" });
      return;
    }
    let active = true;
    AsyncStorage.getItem(PROFILE_KEY)
      .then((stored) => {
        if (stored && active) setProfile({ ...fallbackProfile, ...JSON.parse(stored) });
      })
      .catch(() => undefined)
      .finally(async () => {
        if (!supabase) {
          if (active) setReady(true);
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session) await loadRemoteProfile(data.session.user.id);
        setReady(true);
      });
    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadRemoteProfile(nextSession.user.id);
    }).data.subscription;
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [ageGroup, loadRemoteProfile]);

  const refreshFriends = useCallback(async () => {
    if (!supabase || !session) {
      setFriends([]);
      return;
    }
    const { data, error: requestError } = await supabase.rpc("friend_leaderboard");
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setFriends(
      (data ?? []).map((friend: Record<string, unknown>) => ({
        id: String(friend.id),
        displayName: String(friend.display_name ?? "Player"),
        avatarUrl: typeof friend.avatar_url === "string" ? friend.avatar_url : null,
        xp: Number(friend.xp ?? 0),
        online: Boolean(friend.online),
      })),
    );
  }, [session]);

  useEffect(() => {
    if (ageGroup === "child" || !session) return;
    const timeout = setTimeout(() => void refreshFriends(), 0);
    return () => clearTimeout(timeout);
  }, [ageGroup, refreshFriends, session]);

  useEffect(() => {
    if (ageGroup === "child" || !supabase || !session) return;
    const client = supabase;
    const userId = session.user.id;
    const timeout = setTimeout(() => {
      void client
        .from("profiles")
        .update({ xp, last_seen_at: new Date().toISOString() })
        .eq("id", userId);
      if (puzzles.length > 0)
        void (async () => {
          const rows = [];
          for (const puzzle of puzzles) {
            let imagePath = uploadedPuzzleImages.get(puzzle.id) ?? null;
            if (!imagePath) {
              try {
                const image = await fetch(puzzle.imageUri).then((response) =>
                  response.arrayBuffer(),
                );
                const path = `${userId}/${puzzle.id}.jpg`;
                const { error: imageError } = await client.storage
                  .from("puzzle-images")
                  .upload(path, image, { contentType: "image/jpeg", upsert: true });
                if (!imageError) {
                  imagePath = path;
                  uploadedPuzzleImages.set(puzzle.id, path);
                }
              } catch {
                /* The JSON remains local until the image becomes readable again. */
              }
            }
            rows.push({
              id: puzzle.id,
              user_id: userId,
              name: puzzle.name,
              difficulty: puzzle.difficulty,
              configuration: puzzle.configuration,
              session: puzzle.session,
              image_uri: imagePath,
              completed_at: puzzle.session.completedAt,
              created_at: puzzle.createdAt,
              updated_at: puzzle.updatedAt,
            });
          }
          await client.from("puzzles").upsert(rows);
        })();
      const progress = [
        { key: "first_puzzle", progress: completed ? 100 : 0, unlocked: completed >= 1 },
        {
          key: "no_hints",
          progress: puzzles.some((p) => p.session.completedAt && p.session.hintsUsed === 0)
            ? 100
            : 0,
          unlocked: puzzles.some((p) => p.session.completedAt && p.session.hintsUsed === 0),
        },
        { key: "pieces_250", progress: Math.min(100, placed / 2.5), unlocked: placed >= 250 },
        { key: "puzzles_10", progress: Math.min(100, completed * 10), unlocked: completed >= 10 },
      ];
      void client
        .from("user_achievements")
        .upsert(progress.map((item) => ({ ...item, user_id: userId })));
    }, 700);
    return () => clearTimeout(timeout);
  }, [ageGroup, completed, placed, puzzles, session, xp]);

  useEffect(() => {
    if (ageGroup === "child") return;
    void authenticateGamePlatform().then((player) => {
      if (!player.authenticated) return;
      void reportPlatformAchievement("first_puzzle", completed ? 100 : 0);
      void reportPlatformAchievement(
        "no_hints",
        puzzles.some((p) => p.session.completedAt && p.session.hintsUsed === 0) ? 100 : 0,
      );
      void reportPlatformAchievement("pieces_250", Math.min(100, placed / 2.5));
      void reportPlatformAchievement("puzzles_10", Math.min(100, completed * 10));
    });
  }, [ageGroup, completed, placed, puzzles]);

  const signIn = useCallback(
    async (provider: "google" | "azure") => {
      setError(null);
      if (Constants.appOwnership === "expo") {
        setError(
          t(
            "O login social não funciona dentro do Expo Go. Instale o development build do Pieceful no aparelho e tente novamente.",
            "Social sign-in does not work inside Expo Go. Install the Pieceful development build on your device and try again.",
          ),
        );
        return;
      }
      if (!supabase) {
        setError("Supabase environment variables are not configured.");
        return;
      }
      setBusy(true);
      try {
        const redirectTo = NATIVE_AUTH_CALLBACK;
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            scopes: provider === "azure" ? "email" : undefined,
            queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
          },
        });
        if (oauthError) throw oauthError;
        const result = await openAuthSession(data.url, redirectTo);
        if (result.type !== "success") {
          if (result.type !== "cancel" && result.type !== "dismiss")
            throw new Error("AUTH_CALLBACK_FAILED");
          return;
        }
        const callback = new URL(result.url);
        const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
        const callbackErrorCode =
          callback.searchParams.get("error_code") ??
          callback.searchParams.get("error") ??
          fragment.get("error_code") ??
          fragment.get("error");
        const callbackError =
          callback.searchParams.get("error_description") ?? fragment.get("error_description");
        if (callbackErrorCode || callbackError)
          throw new Error(callbackErrorCode ?? callbackError ?? "AUTH_CALLBACK_FAILED");

        const code = callback.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          return;
        }

        const accessToken =
          fragment.get("access_token") ?? callback.searchParams.get("access_token");
        const refreshToken =
          fragment.get("refresh_token") ?? callback.searchParams.get("refresh_token");
        if (!accessToken || !refreshToken)
          throw new Error("OAuth did not return a valid app session.");
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      } catch (caught) {
        void WebBrowser.dismissBrowser().catch(() => undefined);
        const message = caught instanceof Error ? caught.message : "Unable to sign in.";
        if (message === "AUTH_TIMEOUT") {
          setError(
            t(
              "O login demorou demais. Verifique a conexão e tente novamente.",
              "Sign-in took too long. Check your connection and try again.",
            ),
          );
        } else if (message === "signup_disabled" || /signup|signups|cadastro/i.test(message)) {
          setError(
            t(
              "Novos usuários estão desativados no Supabase. Ative ‘Allow new users to sign up’ e tente novamente.",
              "New users are disabled in Supabase. Enable ‘Allow new users to sign up’ and try again.",
            ),
          );
        } else if (message === "AUTH_CALLBACK_FAILED") {
          setError(
            t(
              "O login não conseguiu retornar ao Pieceful. Verifique as Redirect URLs do Supabase.",
              "Sign-in could not return to Pieceful. Check the Supabase Redirect URLs.",
            ),
          );
        } else {
          setError(message);
        }
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    await supabase?.auth.signOut();
    setSession(null);
    setFriends([]);
    setBusy(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) return;
    setBusy(true);
    setError(null);
    const { error: deleteError } = await supabase.rpc("delete_my_account");
    if (deleteError) {
      setError(deleteError.message);
      setBusy(false);
      throw deleteError;
    }
    await supabase.auth.signOut({ scope: "local" });
    await AsyncStorage.removeItem(PROFILE_KEY);
    setSession(null);
    setFriends([]);
    setProfile(fallbackProfile);
    setBusy(false);
  }, [session]);

  const updateProfile = useCallback(
    async (input: Pick<PlayerProfile, "displayName" | "avatarUrl" | "bio">) => {
      const next = { ...profile, ...input, id: session?.user.id ?? profile.id, xp };
      setProfile(next);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      if (supabase && session) {
        const { error: updateError } = await supabase.from("profiles").upsert({
          id: session.user.id,
          display_name: next.displayName,
          avatar_url: next.avatarUrl,
          bio: next.bio,
          xp,
        });
        if (updateError) setError(updateError.message);
      }
    },
    [profile, session, xp],
  );

  const uploadAvatar = useCallback(
    async (uri: string) => {
      if (!supabase || !session) return uri;
      const body = await fetch(uri).then((response) => response.arrayBuffer());
      const path = `${session.user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, body, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (uploadError) throw uploadError;
      return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    },
    [session],
  );

  const value = useMemo<SocialState>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      profile: { ...profile, xp },
      friends,
      busy,
      error,
      signIn,
      signOut,
      deleteAccount,
      updateProfile,
      uploadAvatar,
      refreshFriends,
    }),
    [
      busy,
      deleteAccount,
      error,
      friends,
      profile,
      ready,
      refreshFriends,
      session,
      signIn,
      signOut,
      updateProfile,
      uploadAvatar,
      xp,
    ],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("useSocial must be used inside SocialProvider");
  return context;
}
