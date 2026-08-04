import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { FrostedBackdrop } from "@/components/frosted-surface";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { AppHeader, PrimaryButton } from "@/components/pieceful-ui";
import { SocialPersonCard } from "@/components/social-person-card";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getProgressionFromXp } from "@/lib/progression";
import { useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";
import { styles } from "@/features/tabs/friends.styles";

export default function FriendsScreen() {
  const { preferences, t, theme } = useApp();
  const {
    blockPlayer,
    busy,
    clearPlayerSearch,
    error,
    friendRequests,
    friends,
    profile,
    refreshFriends,
    removeFriend,
    respondFriendRequest,
    searchPlayers,
    searchResults,
    sendFriendRequest,
    session,
    socialBusy,
  } = useSocial();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const [query, setQuery] = useState("");
  const ranking = [
    {
      id: "me",
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      xp: profile.xp,
      online: true,
      me: true,
    },
    ...friends.map((friend) => ({ ...friend, me: false })),
  ].sort((a, b) => b.xp - a.xp);

  const inviteFriends = async () => {
    await Share.share({
      message: t(
        `Venha montar quebra-cabeças comigo no Pieceful! Meu código de amigo é ${profile.friendCode ?? "—"}.`,
        `Join me on Pieceful! My friend code is ${profile.friendCode ?? "—"}.`,
      ),
      title: t("Convite Pieceful", "Pieceful invitation"),
    });
  };

  const confirmFriendRemoval = (id: string, name: string) =>
    showAlert(
      t("Gerenciar amizade", "Manage friendship"),
      t(`O que deseja fazer com ${name}?`, `What would you like to do with ${name}?`),
      [
        { text: t("Cancelar", "Cancel"), style: "cancel" },
        {
          text: t("Remover amigo", "Remove friend"),
          style: "destructive",
          onPress: () => void removeFriend(id),
        },
        {
          text: t("Bloquear", "Block"),
          style: "destructive",
          onPress: () => void blockPlayer(id),
        },
      ],
    );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => void refreshFriends()}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={t("Amigos", "Friends")} showTitle back />

        <View
          style={[styles.hero, { borderColor: `${colors.accent}42`, borderRadius: colors.radius }]}
        >
          <FrostedBackdrop intensity={62} />
          <View style={styles.heroCopy}>
            <Text style={[styles.kicker, { color: colors.accent }]}>
              {t("PLACAR SOCIAL", "SOCIAL LEADERBOARD")}
            </Text>
            <Text style={[styles.heading, { color: colors.text }]}>
              {t("Evoluam juntos", "Level up together")}
            </Text>
            <Text style={[styles.heroDescription, { color: colors.muted }]}>
              {t(
                "Compare XP, acompanhe seus amigos e descubra quem está na frente.",
                "Compare XP, follow your friends and see who is ahead.",
              )}
            </Text>
          </View>
          <LinearGradient colors={[colors.accent, colors.primary]} style={styles.heroIcon}>
            <Ionicons name="people" size={29} color="#101525" />
          </LinearGradient>
          <View style={styles.statsRow}>
            <View style={[styles.stat, { backgroundColor: `${colors.panelAlt}b8` }]}>
              <Ionicons name="people-outline" size={17} color={colors.accent} />
              <Text style={[styles.statValue, { color: colors.text }]}>{ranking.length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                {ranking.length === 1 ? t("jogador", "player") : t("jogadores", "players")}
              </Text>
            </View>
            <View style={[styles.stat, { backgroundColor: `${colors.panelAlt}b8` }]}>
              <Ionicons name="flash-outline" size={17} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {profile.xp.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>XP</Text>
            </View>
          </View>
        </View>

        {!session ? (
          <View
            style={[
              styles.empty,
              {
                borderColor: `${colors.accent}35`,
                borderRadius: colors.radius,
              },
            ]}
          >
            <FrostedBackdrop intensity={58} />
            <View style={[styles.emptyIcon, { backgroundColor: colors.panelAlt }]}>
              <Ionicons name="people-circle-outline" size={38} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("Seu placar começa aqui", "Your leaderboard starts here")}
            </Text>
            <Text style={[styles.emptyCopy, { color: colors.muted }]}>
              {t(
                "Entre para sincronizar seu XP e encontrar seus amigos.",
                "Sign in to sync your XP and find your friends.",
              )}
            </Text>
            <PrimaryButton onPress={() => router.push("/(tabs)/account" as never)}>
              {t("Entrar na conta", "Sign in")}
            </PrimaryButton>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.socialTools,
                {
                  borderColor: `${colors.accent}38`,
                  borderRadius: Math.max(18, colors.radius),
                },
              ]}
            >
              <FrostedBackdrop intensity={54} />
              <View style={styles.codeRow}>
                <View style={[styles.codeIcon, { backgroundColor: colors.panelAlt }]}>
                  <Ionicons name="person-add-outline" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.codeLabel, { color: colors.muted }]}>
                    {t("SEU CÓDIGO DE AMIGO", "YOUR FRIEND CODE")}
                  </Text>
                  <Text selectable style={[styles.codeValue, { color: colors.text }]}>
                    {profile.friendCode ??
                      t("Execute a atualização do banco", "Run the database update")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void inviteFriends()}
                  style={[styles.codeShare, { backgroundColor: colors.accent }]}
                >
                  <Ionicons name="share-social" size={19} color={colors.background} />
                </Pressable>
              </View>
              <View
                style={[
                  styles.searchRow,
                  {
                    backgroundColor: colors.panelAlt,
                    borderColor: `${colors.accent}35`,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={20} color={colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    if (!value.trim()) clearPlayerSearch();
                  }}
                  onSubmitEditing={() => void searchPlayers(query)}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t("Nome, código ou e-mail exato", "Name, code, or exact email")}
                  placeholderTextColor={colors.muted}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {query ? (
                  <Pressable
                    onPress={() => {
                      setQuery("");
                      clearPlayerSearch();
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                  </Pressable>
                ) : null}
                <Pressable
                  disabled={query.trim().length < 3 || socialBusy}
                  onPress={() => void searchPlayers(query)}
                  style={[
                    styles.searchButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: query.trim().length < 3 ? 0.45 : 1,
                    },
                  ]}
                >
                  {socialBusy ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Ionicons name="arrow-forward" size={19} color={colors.background} />
                  )}
                </Pressable>
              </View>
            </View>

            {error ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: `${colors.primary}18`,
                    borderColor: `${colors.primary}55`,
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              </View>
            ) : null}

            {searchResults.length ? (
              <View style={styles.socialSection}>
                <Text style={[styles.sectionKicker, { color: colors.accent }]}>
                  {t("RESULTADOS", "RESULTS")}
                </Text>
                <View style={styles.compactList}>
                  {searchResults.map((player) => (
                    <SocialPersonCard
                      key={player.id}
                      player={player}
                      colors={colors}
                      t={t}
                      actionLabel={
                        player.relationshipStatus === "accepted"
                          ? t("Amigo", "Friend")
                          : player.relationshipStatus === "pending"
                            ? player.relationshipDirection === "incoming"
                              ? t("Pendente", "Pending")
                              : t("Enviado", "Sent")
                            : t("Adicionar", "Add")
                      }
                      actionIcon={player.relationshipStatus ? "checkmark" : "person-add"}
                      disabled={Boolean(player.relationshipStatus) || socialBusy}
                      onAction={() => void sendFriendRequest(player.id)}
                    />
                  ))}
                </View>
              </View>
            ) : query.trim().length >= 3 && !socialBusy ? (
              <Text style={[styles.noResults, { color: colors.muted }]}>
                {t("Nenhum jogador encontrado.", "No players found.")}
              </Text>
            ) : null}

            {friendRequests.some((request) => request.direction === "incoming") ? (
              <View style={styles.socialSection}>
                <Text style={[styles.sectionKicker, { color: colors.primary }]}>
                  {t("SOLICITAÇÕES RECEBIDAS", "FRIEND REQUESTS")}
                </Text>
                <View style={styles.compactList}>
                  {friendRequests
                    .filter((request) => request.direction === "incoming")
                    .map((request) => (
                      <SocialPersonCard
                        key={request.id}
                        player={request}
                        colors={colors}
                        t={t}
                        actionLabel={t("Aceitar", "Accept")}
                        actionIcon="checkmark"
                        disabled={socialBusy}
                        onAction={() => void respondFriendRequest(request.id, true)}
                        secondaryLabel={t("Recusar", "Decline")}
                        onSecondary={() => void respondFriendRequest(request.id, false)}
                      />
                    ))}
                </View>
              </View>
            ) : null}

            {friendRequests.some((request) => request.direction === "outgoing") ? (
              <View style={styles.socialSection}>
                <Text style={[styles.sectionKicker, { color: colors.muted }]}>
                  {t("CONVITES ENVIADOS", "SENT REQUESTS")}
                </Text>
                <View style={styles.compactList}>
                  {friendRequests
                    .filter((request) => request.direction === "outgoing")
                    .map((request) => (
                      <SocialPersonCard
                        key={request.id}
                        player={request}
                        colors={colors}
                        t={t}
                        actionLabel={t("Cancelar", "Cancel")}
                        actionIcon="close"
                        disabled={socialBusy}
                        onAction={() => void removeFriend(request.id)}
                      />
                    ))}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionRow}>
              <View>
                <Text style={[styles.sectionKicker, { color: colors.accent }]}>
                  {t("RANKING", "RANKING")}
                </Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("Quem está na frente?", "Who is ahead?")}
                </Text>
              </View>
              <View
                style={[
                  styles.livePill,
                  {
                    backgroundColor: `${colors.accent}16`,
                    borderColor: `${colors.accent}40`,
                  },
                ]}
              >
                <View style={[styles.liveDot, { backgroundColor: "#47e887" }]} />
                <Text style={[styles.liveText, { color: colors.muted }]}>
                  {t("Ao vivo", "Live")}
                </Text>
              </View>
            </View>

            <View style={styles.list}>
              {ranking.map((friend, index) => {
                const friendProgression = getProgressionFromXp(friend.xp);
                const level = friendProgression.level;
                const levelProgress = friendProgression.progressPercent;
                const rankColor =
                  index === 0
                    ? "#ffd65a"
                    : index === 1
                      ? "#c9d3e2"
                      : index === 2
                        ? "#d99865"
                        : colors.muted;
                return (
                  <Animated.View
                    entering={
                      preferences.reducedMotion
                        ? undefined
                        : FadeInUp.delay(index * 65).duration(380)
                    }
                    key={friend.id}
                    style={[
                      styles.friendCard,
                      {
                        borderColor: friend.me ? `${colors.accent}7a` : `${colors.muted}30`,
                        borderRadius: Math.max(14, colors.radius),
                      },
                    ]}
                  >
                    <FrostedBackdrop intensity={friend.me ? 70 : 50} />
                    {friend.me ? (
                      <LinearGradient
                        pointerEvents="none"
                        colors={[`${colors.accent}18`, "transparent"]}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <Pressable
                      style={({ pressed }) => [
                        styles.friendTouchArea,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <View style={styles.friendContent}>
                        <View style={styles.rankMark}>
                          {index < 3 ? (
                            <Ionicons name="trophy" size={38} color={`${rankColor}a8`} />
                          ) : null}
                          <Text
                            style={[
                              styles.rank,
                              index < 3 ? styles.rankOnTrophy : null,
                              { color: rankColor },
                            ]}
                          >
                            {index + 1}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.avatarRing,
                            {
                              borderColor: friend.me ? colors.accent : `${colors.muted}55`,
                            },
                          ]}
                        >
                          <View style={[styles.avatar, { backgroundColor: colors.panelAlt }]}>
                            {friend.avatarUrl ? (
                              <Image
                                source={{ uri: friend.avatarUrl }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                              />
                            ) : (
                              <Ionicons name="person" size={27} color={colors.accent} />
                            )}
                          </View>
                          {friend.online ? (
                            <View
                              style={[
                                styles.online,
                                {
                                  backgroundColor: "#47e887",
                                  borderColor: colors.panel,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <View style={styles.friendCopy}>
                          <View style={styles.nameRow}>
                            <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
                              {friend.displayName}
                            </Text>
                            {friend.me ? (
                              <View
                                style={[styles.youPill, { backgroundColor: `${colors.accent}1c` }]}
                              >
                                <Text style={[styles.youText, { color: colors.accent }]}>
                                  {t("VOCÊ", "YOU")}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={[styles.status, { color: colors.muted }]}>
                            {t(`Nível ${level}`, `Level ${level}`)} ·{" "}
                            {friend.online
                              ? t("online agora", "online now")
                              : t("offline", "offline")}
                          </Text>
                          <View
                            style={[styles.progressTrack, { backgroundColor: colors.panelAlt }]}
                          >
                            <LinearGradient
                              colors={[colors.accent, colors.primary]}
                              style={[
                                styles.progressFill,
                                { width: `${Math.max(2, levelProgress)}%` },
                              ]}
                            />
                          </View>
                        </View>

                        <View style={styles.xp}>
                          <Text style={[styles.xpValue, { color: colors.accent }]}>
                            {friend.xp.toLocaleString()}
                          </Text>
                          <Text style={[styles.xpLabel, { color: colors.muted }]}>XP</Text>
                          {!friend.me ? (
                            <Pressable
                              hitSlop={8}
                              onPress={() => confirmFriendRemoval(friend.id, friend.displayName)}
                              style={styles.manageFriend}
                            >
                              <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            {friends.length === 0 ? (
              <View
                style={[
                  styles.invite,
                  {
                    borderColor: `${colors.primary}38`,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <FrostedBackdrop intensity={46} />
                <View style={[styles.inviteIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="person-add-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.inviteCopy}>
                  <Text style={[styles.inviteTitle, { color: colors.text }]}>
                    {t("Seu ranking precisa de rivais", "Your ranking needs rivals")}
                  </Text>
                  <Text style={[styles.inviteDescription, { color: colors.muted }]}>
                    {t("Convide amigos para comparar XP.", "Invite friends to compare XP.")}
                  </Text>
                </View>
                <View style={[styles.shareButton, { backgroundColor: colors.primary }]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void inviteFriends()}
                    style={({ pressed }) => [
                      styles.shareTouchArea,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Ionicons name="share-social" size={20} color="#17102d" />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
