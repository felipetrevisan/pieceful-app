import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getLevelRewards, getPlayerProgression } from "@/lib/progression";
import {
  downloadImagePack,
  formatPackSize,
  getInstalledImagePacks,
  type ImagePack,
  listImagePacks,
  removeImagePack,
} from "@/services/image-packs";
import { useApp } from "@/state/app-provider";
import { useMonetization } from "@/state/monetization-provider";

export function ImagePackLibrary({
  visible,
  onClose,
  onInstalledChange,
}: {
  visible: boolean;
  onClose: () => void;
  onInstalledChange: (packs: ImagePack[]) => void;
}) {
  const { ageGroup, claimedRewardIds, puzzles, t, theme } = useApp();
  const { loadPackProducts, ownedProductIds, packProducts, purchasePack, restorePurchases } =
    useMonetization();
  const { showAlert } = usePiecefulAlert();
  const colors = mobileThemes[theme];
  const [catalog, setCatalog] = useState<ImagePack[]>([]);
  const [installed, setInstalled] = useState<ImagePack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const installedIds = useMemo(() => new Set(installed.map((pack) => pack.id)), [installed]);
  const availableCatalog = useMemo(
    () => catalog.filter((pack) => !installedIds.has(pack.id)),
    [catalog, installedIds],
  );
  const progression = getPlayerProgression(puzzles);
  const rewards = getLevelRewards(ageGroup);
  const ownsLevelPack = useCallback((pack: ImagePack) => {
    if (!pack.rewardLevel) return false;
    const reward = rewards.find((item) => item.kind === "pack" && item.level === pack.rewardLevel);
    return progression.level >= pack.rewardLevel && Boolean(reward && claimedRewardIds.includes(reward.id));
  }, [claimedRewardIds, progression.level, rewards]);
  const visibleInstalled = useMemo(
    () =>
      installed.filter((pack) =>
        pack.audience
          ? pack.audience === "all" || pack.audience === ageGroup
          : ageGroup === "child",
      ),
    [ageGroup, installed],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const local = await getInstalledImagePacks();
      setInstalled(local);
      onInstalledChange(local);
      const remote = await listImagePacks(ageGroup ?? "adult");
      setCatalog(remote);
      await loadPackProducts(remote.flatMap((pack) => (pack.productId ? [pack.productId] : [])));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ageGroup, loadPackProducts, onInstalledChange]);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh, visible]);

  async function download(pack: ImagePack) {
    setProgress((current) => ({ ...current, [pack.id]: 1 }));
    try {
      const next = await downloadImagePack(pack, (value) =>
        setProgress((current) => ({ ...current, [pack.id]: value })),
      );
      const packs = [...installed.filter((item) => item.id !== next.id), next];
      setInstalled(packs);
      onInstalledChange(packs);
    } catch {
      showAlert(
        t("Download interrompido", "Download interrupted"),
        t("Confira sua conexão e tente novamente.", "Check your connection and try again."),
      );
    } finally {
      setProgress((current) => {
        const next = { ...current };
        delete next[pack.id];
        return next;
      });
    }
  }

  function acquire(pack: ImagePack) {
    if (pack.rewardLevel && !ownsLevelPack(pack)) {
      showAlert(
        t("Recompensa ainda bloqueada", "Reward still locked"),
        t(
          `Chegue ao nível ${pack.rewardLevel} e resgate o prêmio na tela de Conquistas.`,
          `Reach level ${pack.rewardLevel} and claim the prize on the Achievements screen.`,
        ),
      );
      return;
    }
    if (pack.isFree || ownsLevelPack(pack) || (pack.productId && ownedProductIds.includes(pack.productId))) {
      void download(pack);
      return;
    }
    if (!pack.productId) {
      showAlert(
        t("Pacote indisponível", "Pack unavailable"),
        t(
          "Este pacote ainda não foi configurado na loja.",
          "This pack hasn't been configured in the store yet.",
        ),
      );
      return;
    }
    const price = packProducts[pack.productId]?.priceString ?? "";
    showAlert(
      t("Desbloquear pacote?", "Unlock pack?"),
      ageGroup === "child"
        ? t(
            `Peça a um responsável para confirmar a compra${price ? ` de ${price}` : ""}.`,
            `Ask a parent or guardian to confirm the${price ? ` ${price}` : ""} purchase.`,
          )
        : t(
            `Este é um pagamento único${price ? ` de ${price}` : ""}.`,
            `This is a one-time${price ? ` ${price}` : ""} purchase.`,
          ),
      [
        { text: t("Agora não", "Not now"), style: "cancel" },
        {
          text:
            ageGroup === "child" ? t("Sou responsável", "I'm the guardian") : t("Comprar", "Buy"),
          icon: "cart",
          onPress: () =>
            void purchasePack(pack.productId as string).then((purchased) => {
              if (purchased) void download(pack);
              else
                showAlert(
                  t("Compra não concluída", "Purchase not completed"),
                  t(
                    "Nenhuma cobrança foi feita. Tente novamente quando quiser.",
                    "You weren't charged. Try again whenever you're ready.",
                  ),
                );
            }),
        },
      ],
    );
  }

  function confirmRemove(pack: ImagePack) {
    showAlert(
      t("Remover pacote?", "Remove pack?"),
      t(
        "As imagens baixadas serão apagadas deste aparelho.",
        "Downloaded images will be removed from this device.",
      ),
      [
        { text: t("Cancelar", "Cancel"), style: "cancel" },
        {
          text: t("Remover", "Remove"),
          style: "destructive",
          onPress: () =>
            void removeImagePack(pack).then(async () => {
              const packs = await getInstalledImagePacks();
              setInstalled(packs);
              onInstalledChange(packs);
            }),
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {Platform.OS === "android" ? (
          <BlurView
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={70}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <SafeAreaView
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: `${colors.accent}55` },
          ]}
          edges={["top", "bottom"]}
        >
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.panelAlt }]}>
              <Ionicons name="gift-outline" size={25} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {ageGroup === "child"
                  ? t("Novas aventuras", "New adventures")
                  : t("Galeria de pacotes", "Pack gallery")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {t(
                  "Baixe pacotes prontos para jogar offline",
                  "Download ready-to-play packs for offline use",
                )}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("Fechar", "Close")}
              onPress={onClose}
              style={[styles.close, { backgroundColor: colors.panelAlt }]}
            >
              <Ionicons name="close" size={23} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {visibleInstalled.length ? (
              <Text style={[styles.section, { color: colors.accent }]}>
                {t("MEUS PACOTES", "MY PACKS")}
              </Text>
            ) : null}
            {visibleInstalled.map((pack) => (
              <PackCard
                key={`installed-${pack.id}`}
                pack={pack}
                installed
                colors={colors}
                progress={undefined}
                t={t}
                onAction={() => confirmRemove(pack)}
              />
            ))}

            <Text style={[styles.section, { color: colors.accent }]}>
              {t("DESCOBRIR PACOTES", "DISCOVER PACKS")}
            </Text>
            {loading ? (
              <View style={styles.message}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[styles.messageText, { color: colors.muted }]}>
                  {t("Buscando novas aventuras…", "Finding new adventures…")}
                </Text>
              </View>
            ) : null}
            {!loading && error ? (
              <View style={styles.message}>
                <Ionicons name="cloud-offline-outline" size={34} color={colors.muted} />
                <Text style={[styles.messageText, { color: colors.muted }]}>
                  {t("Não foi possível atualizar os pacotes.", "Couldn't update packs.")}
                </Text>
                <Pressable
                  onPress={() => void refresh()}
                  style={[styles.retry, { borderColor: colors.accent }]}
                >
                  <Text style={{ color: colors.accent }}>{t("Tentar novamente", "Try again")}</Text>
                </Pressable>
              </View>
            ) : null}
            {!loading && !error && catalog.length === 0 ? (
              <View style={styles.message}>
                <Ionicons name="sparkles-outline" size={34} color={colors.accent} />
                <Text style={[styles.messageText, { color: colors.muted }]}>
                  {t("Novos pacotes aparecerão aqui em breve.", "New packs will appear here soon.")}
                </Text>
              </View>
            ) : null}
            {availableCatalog.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                installed={installedIds.has(pack.id)}
                owned={
                  pack.rewardLevel
                    ? ownsLevelPack(pack)
                    : pack.isFree || Boolean(pack.productId && ownedProductIds.includes(pack.productId))
                }
                price={pack.productId ? packProducts[pack.productId]?.priceString : undefined}
                colors={colors}
                progress={progress[pack.id]}
                t={t}
                onAction={() => acquire(pack)}
              />
            ))}
            <Pressable
              onPress={() => void restorePurchases()}
              style={[styles.restore, { borderColor: `${colors.accent}55` }]}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.accent} />
              <Text style={{ color: colors.accent }}>
                {t("Restaurar compras", "Restore purchases")}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function PackCard({
  pack,
  installed,
  owned = true,
  price,
  progress,
  colors,
  t,
  onAction,
}: {
  pack: ImagePack;
  installed: boolean;
  owned?: boolean;
  price?: string;
  progress?: number;
  colors: (typeof mobileThemes)[keyof typeof mobileThemes];
  t: (portuguese: string, english: string) => string;
  onAction: () => void;
}) {
  const downloading = progress !== undefined;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.panel, borderColor: `${colors.accent}38` }]}
    >
      <Image
        source={{ uri: pack.coverUrl }}
        style={styles.cover}
        contentFit="cover"
        transition={180}
      />
      <View style={styles.cardBody}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text }]}>
            {t(pack.titlePt, pack.titleEn)}
          </Text>
          <Text numberOfLines={2} style={[styles.cardDescription, { color: colors.muted }]}>
            {t(pack.descriptionPt, pack.descriptionEn)}
          </Text>
          <Text style={[styles.meta, { color: colors.accent }]}>
            {pack.rewardLevel
              ? owned
                ? t("RECOMPENSA", "REWARD")
                : t(`NÍVEL ${pack.rewardLevel}`, `LEVEL ${pack.rewardLevel}`)
              : pack.isFree
              ? t("GRÁTIS", "FREE")
              : owned
                ? t("COMPRADO", "OWNED")
                : (price ?? t("PAGO", "PAID"))}{" "}
            · {pack.imageCount ?? pack.pictures.length} {t("imagens", "pictures")}
            {pack.totalBytes ? ` · ${formatPackSize(pack.totalBytes)}` : ""}
          </Text>
        </View>
        <Pressable
          disabled={downloading}
          onPress={onAction}
          style={[
            styles.action,
            !owned && !installed ? styles.purchaseAction : null,
            {
              backgroundColor: installed ? colors.panelAlt : colors.accent,
              opacity: downloading ? 0.7 : 1,
            },
          ]}
        >
          {downloading ? (
            <Text style={[styles.actionText, { color: colors.background }]}>
              {Math.round(progress)}%
            </Text>
          ) : (
            <>
              <Ionicons
                name={
                  installed ? "trash-outline" : owned ? "cloud-download-outline" : pack.rewardLevel ? "lock-closed-outline" : "cart-outline"
                }
                size={20}
                color={installed ? colors.muted : colors.background}
              />
              {!owned && price ? (
                <Text style={[styles.actionText, { color: colors.background }]}>{price}</Text>
              ) : null}
            </>
          )}
        </Pressable>
      </View>
      {downloading ? (
        <View style={[styles.track, { backgroundColor: colors.panelAlt }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(1, progress)}%`, backgroundColor: colors.accent },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,5,16,.64)" },
  sheet: {
    flex: 1,
    marginTop: 34,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,.12)",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 23 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 18, paddingBottom: 42, gap: 12 },
  section: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5, marginTop: 5 },
  card: { borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  cover: { width: "100%", height: 138 },
  cardBody: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  cardTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 },
  cardDescription: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  meta: { fontFamily: "Inter_700Bold", fontSize: 10, marginTop: 6 },
  action: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseAction: {
    width: "auto",
    minWidth: 66,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 5,
  },
  actionText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  track: { height: 5 },
  fill: { height: "100%", borderRadius: 99 },
  message: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  messageText: {
    maxWidth: 260,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  retry: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 15, paddingVertical: 9 },
  restore: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
  },
});
