import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
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
import { getPlayerProgression } from "@/lib/progression";
import { authenticateGamePlatform, reportPlatformAchievement } from "@/services/game-platform";
import {
  completeOAuthCallback,
  isNativeAuthCallback,
  NATIVE_AUTH_CALLBACK,
  openAuthSession,
} from "@/services/social-auth";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import {
  deleteRemoteAccount,
  deleteRemotePuzzles,
  uploadAvatarImage,
  uploadPuzzleImage,
} from "@/services/uploads";
import { useApp } from "@/state/app-provider";

WebBrowser.maybeCompleteAuthSession();

export interface PlayerProfile {
  id: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  xp: number;
  friendCode: string | null;
}

export interface FriendProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  online: boolean;
}

export interface FriendRequest extends FriendProfile {
  direction: "incoming" | "outgoing";
  createdAt: string;
}

export interface PlayerSearchResult extends FriendProfile {
  friendCode: string;
  relationshipStatus: "pending" | "accepted" | null;
  relationshipDirection: "incoming" | "outgoing" | null;
}

interface SocialState {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  devAccess: boolean;
  profile: PlayerProfile;
  friends: FriendProfile[];
  friendRequests: FriendRequest[];
  searchResults: PlayerSearchResult[];
  socialBusy: boolean;
  busy: boolean;
  error: string | null;
  enterDevAccess: () => Promise<void>;
  exitDevAccess: () => Promise<void>;
  signIn: (provider: "google" | "azure") => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (input: Pick<PlayerProfile, "displayName" | "avatarUrl" | "bio">) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
  refreshFriends: () => Promise<void>;
  searchPlayers: (query: string) => Promise<void>;
  clearPlayerSearch: () => void;
  sendFriendRequest: (targetId: string) => Promise<boolean>;
  respondFriendRequest: (requesterId: string, accept: boolean) => Promise<boolean>;
  removeFriend: (targetId: string) => Promise<boolean>;
  blockPlayer: (targetId: string) => Promise<boolean>;
}

const PROFILE_KEY = "pieceful-mobile-profile-v1";
const DEV_ACCESS_KEY = "pieceful-mobile-dev-access-v1";
const fallbackProfile: PlayerProfile = {
  id: null,
  displayName: "Player One",
  avatarUrl: null,
  bio: "One piece at a time.",
  xp: 0,
  friendCode: null,
};

const SocialContext = createContext<SocialState | null>(null);
const uploadedPuzzleImages = new Map<string, string>();
const syncedPuzzleVersions = new Map<string, string>();

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
  const { acknowledgeDeletedPuzzles, ageGroup, deletedPuzzleIds, mergeRemotePuzzles, puzzles, t } =
    useApp();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [devAccess, setDevAccess] = useState(false);
  const [devAccessReady, setDevAccessReady] = useState(!__DEV__);
  const [profile, setProfile] = useState<PlayerProfile>(fallbackProfile);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [socialBusy, setSocialBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progression = getPlayerProgression(puzzles);
  const completed = progression.completedPuzzles;
  const placed = progression.placedPieces;
  const xp = progression.totalXp;

  useEffect(() => {
    if (!__DEV__) return;
    AsyncStorage.getItem(DEV_ACCESS_KEY)
      .then((value) => setDevAccess(value === "enabled"))
      .catch(() => setDevAccess(false))
      .finally(() => setDevAccessReady(true));
  }, []);

  const enterDevAccess = useCallback(async () => {
    if (!__DEV__) return;
    setDevAccess(true);
    await AsyncStorage.setItem(DEV_ACCESS_KEY, "enabled");
  }, []);

  const exitDevAccess = useCallback(async () => {
    setDevAccess(false);
    if (__DEV__) await AsyncStorage.removeItem(DEV_ACCESS_KEY);
  }, []);

  const loadRemoteProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      const client = supabase;
      const initial = await client.rpc("my_profile");
      if (initial.error) throw initial.error;
      const data = (initial.data?.[0] as Record<string, unknown> | undefined) ?? null;
      if (!data) return;
      const next: PlayerProfile = {
        id: String(data.id),
        displayName: String(data.display_name || "Player One"),
        avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : null,
        bio: String(data.bio || "One piece at a time."),
        xp: Number(data.xp || 0),
        friendCode: typeof data.friend_code === "string" ? data.friend_code : null,
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
                syncedPuzzleVersions.set(row.id, row.updated_at);
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

  useEffect(() => {
    if (!supabase || !ageGroup || ageGroup === "child") return;

    const client = supabase;
    let active = true;
    const handleCallback = async (url: string | null) => {
      if (!url || !isNativeAuthCallback(url)) return;
      setBusy(true);
      setError(null);
      try {
        await completeOAuthCallback(url);
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error("OAuth did not create a valid app session.");
        if (!active) return;
        setSession(data.session);
        await loadRemoteProfile(data.session.user.id);
        void WebBrowser.dismissBrowser().catch(() => undefined);
      } catch (caught) {
        if (!active) return;
        const message = caught instanceof Error ? caught.message : "Unable to sign in.";
        setError(
          message === "AUTH_CALLBACK_FAILED"
            ? t(
                "O login não conseguiu retornar ao Pieceful. Verifique as Redirect URLs do Supabase.",
                "Sign-in could not return to Pieceful. Check the Supabase Redirect URLs.",
              )
            : message,
        );
      } finally {
        if (active) setBusy(false);
      }
    };

    void Linking.getInitialURL().then(handleCallback);
    const subscription = Linking.addEventListener("url", ({ url }) => void handleCallback(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, [ageGroup, loadRemoteProfile, t]);

  const refreshFriends = useCallback(async () => {
    if (!supabase || !session) {
      setFriends([]);
      setFriendRequests([]);
      setSearchResults([]);
      return;
    }
    setError(null);
    const [leaderboard, requests, identity] = await Promise.all([
      supabase.rpc("friend_leaderboard"),
      supabase.rpc("friend_requests"),
      supabase.rpc("my_social_identity"),
    ]);
    const requestError = leaderboard.error ?? requests.error ?? identity.error;
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setFriends(
      (leaderboard.data ?? []).map((friend: Record<string, unknown>) => ({
        id: String(friend.id),
        displayName: String(friend.display_name ?? "Player"),
        avatarUrl: typeof friend.avatar_url === "string" ? friend.avatar_url : null,
        xp: Number(friend.xp ?? 0),
        online: Boolean(friend.online),
      })),
    );
    setFriendRequests(
      (requests.data ?? []).map((request: Record<string, unknown>) => ({
        id: String(request.id),
        displayName: String(request.display_name ?? "Player"),
        avatarUrl: typeof request.avatar_url === "string" ? request.avatar_url : null,
        xp: Number(request.xp ?? 0),
        online: Boolean(request.online),
        direction: request.direction === "incoming" ? "incoming" : "outgoing",
        createdAt: String(request.created_at ?? new Date().toISOString()),
      })),
    );
    const code = (identity.data?.[0] as Record<string, unknown> | undefined)?.friend_code;
    if (typeof code === "string") setProfile((current) => ({ ...current, friendCode: code }));
    setError(null);
  }, [session]);

  const searchPlayers = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!supabase || !session || trimmed.length < 3) {
        setSearchResults([]);
        return;
      }
      setSocialBusy(true);
      setError(null);
      try {
        const { data, error: searchError } = await supabase.rpc("search_players", {
          search_text: trimmed,
        });
        if (searchError) throw searchError;
        setSearchResults(
          (data ?? []).map((player: Record<string, unknown>) => ({
            id: String(player.id),
            displayName: String(player.display_name ?? "Player"),
            avatarUrl: typeof player.avatar_url === "string" ? player.avatar_url : null,
            xp: Number(player.xp ?? 0),
            online: Boolean(player.online),
            friendCode: String(player.friend_code ?? ""),
            relationshipStatus:
              player.relationship_status === "pending" || player.relationship_status === "accepted"
                ? player.relationship_status
                : null,
            relationshipDirection:
              player.relationship_direction === "incoming" ||
              player.relationship_direction === "outgoing"
                ? player.relationship_direction
                : null,
          })),
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to search players.");
      } finally {
        setSocialBusy(false);
      }
    },
    [session],
  );

  const clearPlayerSearch = useCallback(() => setSearchResults([]), []);

  const runFriendAction = useCallback(
    async (name: string, parameters: Record<string, unknown>) => {
      if (!supabase || !session) return false;
      setSocialBusy(true);
      setError(null);
      try {
        const { error: actionError } = await supabase.rpc(name, parameters);
        if (actionError) throw actionError;
        await refreshFriends();
        setSearchResults([]);
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update friendship.");
        return false;
      } finally {
        setSocialBusy(false);
      }
    },
    [refreshFriends, session],
  );

  const sendFriendRequest = useCallback(
    (targetId: string) => runFriendAction("send_friend_request", { target_id: targetId }),
    [runFriendAction],
  );
  const respondFriendRequest = useCallback(
    (requesterId: string, accept: boolean) =>
      runFriendAction("respond_friend_request", {
        requester: requesterId,
        accept_request: accept,
      }),
    [runFriendAction],
  );
  const removeFriend = useCallback(
    (targetId: string) => runFriendAction("remove_friend", { target_id: targetId }),
    [runFriendAction],
  );
  const blockPlayer = useCallback(
    (targetId: string) => runFriendAction("block_player", { target_id: targetId }),
    [runFriendAction],
  );

  useEffect(() => {
    if (ageGroup === "child" || !session) return;
    const timeout = setTimeout(() => void refreshFriends(), 0);
    return () => clearTimeout(timeout);
  }, [ageGroup, refreshFriends, session]);

  const friendIds = useMemo(
    () => [...new Set(friends.map((friend) => friend.id))].sort().join(","),
    [friends],
  );

  useEffect(() => {
    if (ageGroup === "child" || !supabase || !session) return;
    let channel = supabase
      .channel(`pieceful-social-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "pieceful", table: "friendships" },
        () => void refreshFriends(),
      );
    // Depends on the friend-ID set (not the `friends` array reference) so a
    // no-op refreshFriends() call (heartbeat, or this channel's own UPDATE
    // callback) doesn't tear down and recreate the subscription.
    for (const friendId of friendIds ? friendIds.split(",") : []) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "pieceful",
          table: "profiles",
          filter: `id=eq.${friendId}`,
        },
        () => void refreshFriends(),
      );
    }
    channel.subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [ageGroup, friendIds, refreshFriends, session]);

  useEffect(() => {
    if (ageGroup === "child" || !supabase || !session) return;
    const heartbeat = () => void supabase?.rpc("touch_my_profile");
    heartbeat();
    const interval = setInterval(heartbeat, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [ageGroup, session]);

  useEffect(() => {
    if (ageGroup === "child" || !supabase || !session || deletedPuzzleIds.length === 0) return;
    const ids = [...deletedPuzzleIds];
    let active = true;
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          await deleteRemotePuzzles(ids);
        } catch (caught) {
          if (active)
            setError(caught instanceof Error ? caught.message : "Puzzle deletion failed.");
          return;
        }
        for (const id of ids) {
          uploadedPuzzleImages.delete(id);
          syncedPuzzleVersions.delete(id);
        }
        if (active) acknowledgeDeletedPuzzles(ids);
      })();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [acknowledgeDeletedPuzzles, ageGroup, deletedPuzzleIds, session]);

  useEffect(() => {
    if (ageGroup === "child" || !supabase || !session) return;
    const client = supabase;
    const userId = session.user.id;
    const timeout = setTimeout(() => {
      const pendingPuzzles = puzzles.filter(
        (puzzle) => syncedPuzzleVersions.get(puzzle.id) !== puzzle.updatedAt,
      );
      if (pendingPuzzles.length > 0)
        void (async () => {
          const rows = [];
          for (const puzzle of pendingPuzzles) {
            let imagePath = uploadedPuzzleImages.get(puzzle.id) ?? null;
            if (!imagePath) {
              try {
                const path = await uploadPuzzleImage(puzzle.id, puzzle.imageUri);
                imagePath = path;
                uploadedPuzzleImages.set(puzzle.id, path);
              } catch {
                /* The JSON remains local until the image becomes readable again. */
                continue;
              }
            }
            rows.push({
              id: puzzle.id,
              user_id: userId,
              name: puzzle.name,
              difficulty: puzzle.difficulty,
              configuration: puzzle.configuration,
              session: { ...puzzle.session, timelapse: undefined },
              image_uri: imagePath,
              completed_at: puzzle.session.completedAt,
              created_at: puzzle.createdAt,
              updated_at: puzzle.updatedAt,
            });
          }
          for (let index = 0; index < rows.length; index += 5) {
            const batch = rows.slice(index, index + 5);
            const { error: syncError } = await client.rpc("sync_my_puzzles", {
              payloads: batch,
            });
            if (syncError) {
              setError(syncError.message);
              return;
            }
            for (const row of batch) syncedPuzzleVersions.set(row.id, row.updated_at);
          }
        })();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [ageGroup, puzzles, session]);

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
        await completeOAuthCallback(result.url);
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
    syncedPuzzleVersions.clear();
    uploadedPuzzleImages.clear();
    setSession(null);
    setFriends([]);
    setBusy(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) return;
    setBusy(true);
    setError(null);
    try {
      await deleteRemoteAccount();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account deletion failed.");
      setBusy(false);
      throw caught;
    }
    await supabase.auth.signOut({ scope: "local" });
    syncedPuzzleVersions.clear();
    uploadedPuzzleImages.clear();
    await AsyncStorage.removeItem(PROFILE_KEY);
    setSession(null);
    setFriends([]);
    setProfile(fallbackProfile);
    setBusy(false);
  }, [session]);

  const updateProfile = useCallback(
    async (input: Pick<PlayerProfile, "displayName" | "avatarUrl" | "bio">) => {
      const next = {
        ...profile,
        ...input,
        id: session?.user.id ?? profile.id,
        xp,
      };
      setProfile(next);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      if (supabase && session) {
        const { error: updateError } = await supabase.rpc("update_my_profile", {
          next_display_name: next.displayName,
          next_avatar_url: next.avatarUrl,
          next_bio: next.bio,
        });
        if (updateError) setError(updateError.message);
      }
    },
    [profile, session, xp],
  );

  const uploadAvatar = useCallback(
    async (uri: string) => {
      if (!supabase || !session) return uri;
      return uploadAvatarImage(uri);
    },
    [session],
  );

  const value = useMemo<SocialState>(
    () => ({
      ready: ready && devAccessReady,
      configured: isSupabaseConfigured,
      session,
      devAccess,
      profile: { ...profile, xp },
      friends,
      friendRequests,
      searchResults,
      socialBusy,
      busy,
      error,
      enterDevAccess,
      exitDevAccess,
      signIn,
      signOut,
      deleteAccount,
      updateProfile,
      uploadAvatar,
      refreshFriends,
      searchPlayers,
      clearPlayerSearch,
      sendFriendRequest,
      respondFriendRequest,
      removeFriend,
      blockPlayer,
    }),
    [
      busy,
      deleteAccount,
      devAccess,
      devAccessReady,
      enterDevAccess,
      error,
      exitDevAccess,
      friends,
      friendRequests,
      searchResults,
      socialBusy,
      profile,
      ready,
      refreshFriends,
      searchPlayers,
      clearPlayerSearch,
      sendFriendRequest,
      respondFriendRequest,
      removeFriend,
      blockPlayer,
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
