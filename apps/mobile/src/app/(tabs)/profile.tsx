import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { RewardAvatar, RewardFrame } from "@/components/reward-cosmetics";
import { captureRef } from "react-native-view-shot";
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from "@/components/pieceful-ui";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getLevelRewards, getPlayerProgression } from "@/lib/progression";
import { useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";

export default function ProfileScreen() {
  const { ageGroup, claimedRewardIds, equipReward, puzzles, selectedAvatarRewardId, selectedFrameRewardId, t, theme } = useApp();
  const { profile, session, updateProfile, uploadAvatar } = useSocial();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const cardRef = useRef<View>(null);
  const [name, setName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const progression = getPlayerProgression(puzzles);
  const rewards = getLevelRewards(ageGroup);
  const cosmeticRewards = rewards.filter((reward) => claimedRewardIds.includes(reward.id) && (reward.kind === "avatar" || reward.kind === "frame"));
  const selectedAvatar = rewards.find((reward) => reward.id === selectedAvatarRewardId)?.contentKey ?? null;
  const selectedFrame = rewards.find((reward) => reward.id === selectedFrameRewardId)?.contentKey ?? null;
  const legendaryTitle = rewards.find((reward) => reward.kind === "title" && claimedRewardIds.includes(reward.id));
  const completed = progression.completedPuzzles;
  const level = progression.level;
  const visibleName = name ?? profile.displayName;
  const visibleBio = bio ?? profile.bio;
  const visibleAvatar = avatar === undefined ? profile.avatarUrl : avatar;

  async function chooseAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.86 });
    if (!result.canceled) {
      equipReward("avatar", null);
      setAvatar(result.assets[0]?.uri ?? null);
    }
  }

  async function save() {
    if (!visibleName.trim()) return;
    setSaving(true);
    try {
      const avatarUrl = visibleAvatar && visibleAvatar !== profile.avatarUrl ? await uploadAvatar(visibleAvatar) : visibleAvatar;
      await updateProfile({ displayName: visibleName.trim(), bio: visibleBio.trim(), avatarUrl });
      setAvatar(avatarUrl);
      showAlert(t("Perfil atualizado", "Profile updated"), t("Suas alterações foram salvas.", "Your changes were saved."));
    } catch (caught) {
      showAlert(t("Não foi possível salvar", "Unable to save"), caught instanceof Error ? caught.message : t("Tente novamente.", "Try again."));
    } finally { setSaving(false); }
  }

  async function shareCard() {
    if (!cardRef.current) return;
    const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("Compartilhar cartão Pieceful", "Share Pieceful card") });
  }

  return <Screen><AppHeader title={t("Perfil", "Profile")} showTitle back />
    <View style={styles.avatarSection}><Pressable onPress={() => void chooseAvatar()} style={styles.avatar}>{selectedFrame ? <RewardFrame id={selectedFrame} size={112}><View style={[styles.avatarClip, styles.avatarClipFramed, { backgroundColor: colors.panelAlt }]}>{selectedAvatar ? <RewardAvatar id={selectedAvatar} size={104} /> : visibleAvatar ? <Image source={{ uri: visibleAvatar }} style={styles.avatarImage} contentFit="cover" /> : <Ionicons name="person" size={54} color={colors.accent} />}</View></RewardFrame> : <View style={[styles.avatarClip, { backgroundColor: colors.panelAlt, borderColor: colors.accent }]}>{selectedAvatar ? <RewardAvatar id={selectedAvatar} size={108} /> : visibleAvatar ? <Image source={{ uri: visibleAvatar }} style={styles.avatarImage} contentFit="cover" /> : <Ionicons name="person" size={54} color={colors.accent} />}</View>}<View style={[styles.camera, { backgroundColor: colors.accent, borderColor: colors.background }]}><Ionicons name="camera" size={16} color={colors.background} /></View></Pressable><Text style={[styles.editHint, { color: colors.muted }]}>{t("Toque para trocar a foto", "Tap to change photo")}</Text></View>
    <Text style={[styles.label, { color: colors.muted }]}>{t("NOME", "NAME")}</Text><TextInput value={visibleName} onChangeText={setName} placeholder={t("Seu nome", "Your name")} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.panel, borderColor: `${colors.accent}35`, borderRadius: Math.max(10, colors.radius) }]} />
    <Text style={[styles.label, { color: colors.muted }]}>{t("SOBRE VOCÊ", "ABOUT YOU")}</Text><TextInput value={visibleBio} onChangeText={setBio} multiline maxLength={120} placeholder={t("Conte algo sobre você", "Tell us about yourself")} placeholderTextColor={colors.muted} style={[styles.input, styles.bio, { color: colors.text, backgroundColor: colors.panel, borderColor: `${colors.accent}35`, borderRadius: Math.max(10, colors.radius) }]} />
    <PrimaryButton icon="checkmark-circle-outline" disabled={saving} onPress={() => void save()}>{saving ? t("Salvando…", "Saving…") : t("Salvar perfil", "Save profile")}</PrimaryButton>

    {cosmeticRewards.length ? <><View style={styles.inventoryHeading}><View><Text style={[styles.cardHeading, styles.inventoryTitle, { color: colors.text }]}>{t("Seu inventário", "Your inventory")}</Text><Text style={[styles.inventoryDescription, { color: colors.muted }]}>{t("Equipe avatares e molduras conquistados.", "Equip earned avatars and frames.")}</Text></View><Ionicons name="sparkles" size={23} color={colors.accent} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inventoryList}>{cosmeticRewards.map((reward) => { const selected = reward.id === selectedAvatarRewardId || reward.id === selectedFrameRewardId; return <Pressable key={reward.id} onPress={() => equipReward(reward.kind as "avatar" | "frame", selected ? null : reward.id)} style={[styles.inventoryItem, { backgroundColor: colors.panel, borderColor: selected ? colors.accent : `${colors.muted}30` }]}>{reward.kind === "avatar" ? <RewardAvatar id={reward.contentKey ?? "happy"} size={56} /> : <RewardFrame id={reward.contentKey ?? "neon"} size={56}><Ionicons name="person" size={25} color={colors.text} /></RewardFrame>}<Text numberOfLines={1} style={[styles.inventoryLabel, { color: colors.text }]}>{t(reward.titlePt, reward.titleEn)}</Text><View style={[styles.equipBadge, { backgroundColor: selected ? colors.accent : colors.panelAlt }]}><Text style={[styles.equipText, { color: selected ? colors.background : colors.muted }]}>{selected ? t("Equipado", "Equipped") : t("Equipar", "Equip")}</Text></View></Pressable>; })}</ScrollView></> : null}

    <Text style={[styles.cardHeading, { color: colors.text }]}>{t("Seu cartão Pieceful", "Your Pieceful card")}</Text>
    <View ref={cardRef} collapsable={false} style={[styles.shareCard, { backgroundColor: colors.background }]}><LinearGradient colors={[colors.accent, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /><View style={styles.cardOrbOne} /><View style={styles.cardOrbTwo} /><View style={styles.cardTop}><View style={styles.cardBrand}><Ionicons name="extension-puzzle" size={20} color="#071126" /><Text style={styles.cardBrandText}>Pieceful</Text></View><Text style={styles.cardLevel}>{legendaryTitle ? t(legendaryTitle.titlePt, legendaryTitle.titleEn).toUpperCase() : `LEVEL ${level}`}</Text></View><View style={styles.cardIdentity}>{selectedFrame ? <RewardFrame id={selectedFrame} size={64}>{selectedAvatar ? <RewardAvatar id={selectedAvatar} size={56} /> : visibleAvatar ? <Image source={{ uri: visibleAvatar }} style={styles.cardAvatarFramed} contentFit="cover" /> : <View style={styles.cardAvatarFallbackFramed}><Ionicons name="person" size={30} color="#071126" /></View>}</RewardFrame> : selectedAvatar ? <RewardAvatar id={selectedAvatar} size={60} /> : visibleAvatar ? <Image source={{ uri: visibleAvatar }} style={styles.cardAvatar} contentFit="cover" /> : <View style={styles.cardAvatarFallback}><Ionicons name="person" size={34} color="#071126" /></View>}<View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.cardName}>{visibleName}</Text><Text numberOfLines={2} style={styles.cardBio}>{visibleBio}</Text></View></View><View style={styles.cardStats}><View><Text style={styles.cardStatValue}>{progression.totalXp.toLocaleString()}</Text><Text style={styles.cardStatLabel}>XP</Text></View><View><Text style={styles.cardStatValue}>{completed}</Text><Text style={styles.cardStatLabel}>{t("CONCLUÍDOS", "COMPLETED")}</Text></View><Ionicons name="sparkles" size={25} color="#071126" /></View></View>
    <SecondaryButton icon="share-social-outline" onPress={() => void shareCard()}>{t("Gerar e compartilhar cartão", "Create and share card")}</SecondaryButton>
    {!session ? <Text style={[styles.localHint, { color: colors.muted }]}>{t("Entre na sua conta para sincronizar este perfil.", "Sign in to sync this profile.")}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: "center", marginBottom: 20 }, avatar: { width: 120, height: 120, alignItems: "center", justifyContent: "center" }, avatarClip: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }, avatarClipFramed: { width: 104, height: 104, borderWidth: 0 }, avatarImage: { width: "100%", height: "100%", borderRadius: 56 }, camera: { position: "absolute", right: 0, bottom: 0, width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: "center", justifyContent: "center" }, editHint: { fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 12 },
  label: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4, marginBottom: 7, marginTop: 12 }, input: { minHeight: 54, borderWidth: 1, paddingHorizontal: 16, fontFamily: "Inter_600SemiBold", fontSize: 15 }, bio: { height: 94, paddingTop: 14, textAlignVertical: "top", marginBottom: 16 }, cardHeading: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 24, marginTop: 28, marginBottom: 13 },
  shareCard: { aspectRatio: 1.58, borderRadius: 28, overflow: "hidden", padding: 20, justifyContent: "space-between", marginBottom: 13 }, cardOrbOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,.16)", right: -45, top: -65 }, cardOrbTwo: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(7,17,38,.12)", left: -32, bottom: -32 }, cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardBrand: { flexDirection: "row", alignItems: "center", gap: 6 }, cardBrandText: { color: "#071126", fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 19 }, cardLevel: { color: "#071126", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 },
  cardIdentity: { flexDirection: "row", alignItems: "center", gap: 13 }, cardAvatar: { width: 60, height: 60, borderRadius: 30 }, cardAvatarFramed: { width: 56, height: 56, borderRadius: 28 }, cardAvatarFallback: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,.52)", alignItems: "center", justifyContent: "center" }, cardAvatarFallbackFramed: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,.52)", alignItems: "center", justifyContent: "center" }, cardName: { color: "#071126", fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 24 }, cardBio: { color: "rgba(7,17,38,.72)", fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3 }, cardStats: { flexDirection: "row", alignItems: "flex-end", gap: 28 }, cardStatValue: { color: "#071126", fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 22 }, cardStatLabel: { color: "rgba(7,17,38,.65)", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: .8 }, localHint: { fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center", marginTop: 10 },
  inventoryHeading: { marginTop: 25, marginBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, inventoryTitle: { marginTop: 0, marginBottom: 0 }, inventoryDescription: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 }, inventoryList: { gap: 11, paddingRight: 20, paddingBottom: 3 }, inventoryItem: { width: 132, minHeight: 156, borderWidth: 1, borderRadius: 22, padding: 13, alignItems: "center", gap: 8 }, inventoryLabel: { width: "100%", textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 12 }, equipBadge: { minHeight: 28, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }, equipText: { fontFamily: "Inter_700Bold", fontSize: 9 },
});
