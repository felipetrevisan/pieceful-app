import { Ionicons } from "@expo/vector-icons";
import {
  DIFFICULTIES,
  orientPuzzleGrid,
  type PuzzleConfiguration,
  type PuzzleDifficulty,
  resolvePuzzleOrientation,
} from "@puzzled/shared";
import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { ImagePackLibrary } from "@/components/kid-pack-library";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import {
  AppHeader,
  MutedText,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getInstalledImagePacks, type ImagePack } from "@/services/image-packs";
import { useApp } from "@/state/app-provider";
import { CollapsibleStepCard, DifficultySlider, OptionRow } from "@/features/tabs/create-controls";
import { styles } from "@/features/tabs/create.styles";

const presets = DIFFICULTIES;
const kidPictures = [
  {
    source: require("../../../assets/images/kids/dinosaur-picnic.png"),
    pt: "Piquenique dos dinos",
    en: "Dino picnic",
  },
  {
    source: require("../../../assets/images/kids/happy-space.png"),
    pt: "Viagem espacial",
    en: "Space trip",
  },
  {
    source: require("../../../assets/images/kids/ocean-friends.png"),
    pt: "Amigos do oceano",
    en: "Ocean friends",
  },
  {
    source: require("../../../assets/images/kids/rainbow-castle.png"),
    pt: "Castelo arco-íris",
    en: "Rainbow castle",
  },
  {
    source: require("../../../assets/images/kids/dragon-bakery.png"),
    pt: "Confeitaria dos dragões",
    en: "Dragon bakery",
  },
  {
    source: require("../../../assets/images/kids/animal-train.png"),
    pt: "Trem dos animais",
    en: "Animal train",
  },
  {
    source: require("../../../assets/images/kids/robot-workshop.png"),
    pt: "Oficina de robôs",
    en: "Robot workshop",
  },
  {
    source: require("../../../assets/images/kids/jungle-orchestra.png"),
    pt: "Orquestra da selva",
    en: "Jungle orchestra",
  },
  {
    source: require("../../../assets/images/kids/penguin-festival.png"),
    pt: "Festival dos pinguins",
    en: "Penguin festival",
  },
  {
    source: require("../../../assets/images/kids/friendly-city.png"),
    pt: "Cidade dos amigos",
    en: "Friendly city",
  },
  {
    source: require("../../../assets/images/kids/magical-garden.png"),
    pt: "Jardim encantado",
    en: "Magical garden",
  },
] as const;

const starterPictures = [
  {
    source: require("../../../assets/images/starter/aurora-lake.png"),
    pt: "Refúgio sob a aurora",
    en: "Aurora retreat",
  },
  {
    source: require("../../../assets/images/starter/neon-metropolis.png"),
    pt: "Metrópole neon",
    en: "Neon metropolis",
  },
  {
    source: require("../../../assets/images/starter/mediterranean-coast.png"),
    pt: "Costa mediterrânea",
    en: "Mediterranean coast",
  },
  {
    source: require("../../../assets/images/starter/tropical-feathers.png"),
    pt: "Cores tropicais",
    en: "Tropical colors",
  },
  {
    source: require("../../../assets/images/starter/desert-oasis.png"),
    pt: "Oásis dourado",
    en: "Golden oasis",
  },
  {
    source: require("../../../assets/images/starter/cosmic-voyage.png"),
    pt: "Viagem cósmica",
    en: "Cosmic voyage",
  },
  {
    source: require("../../../assets/images/starter/grand-library.png"),
    pt: "Biblioteca encantada",
    en: "Enchanted library",
  },
  {
    source: require("../../../assets/images/starter/tropical-waterfall.png"),
    pt: "Jardim das cachoeiras",
    en: "Waterfall garden",
  },
] as const;

interface KidPicture {
  key: string;
  source: number | string;
  pt: string;
  en: string;
  width: number;
  height: number;
}

const BUILT_IN_GALLERY_ID = "built-in";

export default function CreateScreen() {
  const { ageGroup, createPuzzle, preferences, t, theme } = useApp();
  const { width } = useWindowDimensions();
  const colors = mobileThemes[theme];
  const { showAlert } = usePiecefulAlert();
  const kidCardWidth = Math.min(282, width - 92);
  const kidCarouselStep = kidCardWidth + 12;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("normal");
  const [kidCarouselIndex, setKidCarouselIndex] = useState(0);
  const [selectedKidPicture, setSelectedKidPicture] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<ImagePack[]>([]);
  const [activeGalleryId, setActiveGalleryId] = useState(BUILT_IN_GALLERY_ID);
  const [showPackLibrary, setShowPackLibrary] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({
    photo: true,
    difficulty: true,
    options: true,
  });
  const [configuration, setConfiguration] = useState<PuzzleConfiguration>({
    rows: 6,
    columns: 8,
    totalPieces: 48,
    rotationEnabled: false,
    hintsEnabled: true,
    referenceEnabled: true,
    timerEnabled: true,
  });

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.pieces === configuration.totalPieces),
    [configuration.totalPieces],
  );
  const compatibleInstalledPacks = useMemo(
    () =>
      installedPacks.filter((pack) =>
        pack.audience
          ? pack.audience === "all" || pack.audience === ageGroup
          : ageGroup === "child",
      ),
    [ageGroup, installedPacks],
  );
  const activePack = useMemo(
    () => compatibleInstalledPacks.find((pack) => pack.id === activeGalleryId) ?? null,
    [activeGalleryId, compatibleInstalledPacks],
  );
  const visibleGalleryId = activePack?.id ?? BUILT_IN_GALLERY_ID;
  const availableKidPictures = useMemo<KidPicture[]>(() => {
    if (!activePack) {
      return (ageGroup === "child" ? kidPictures : starterPictures).map((picture) => ({
        ...picture,
        key: `built-in-${picture.en}`,
        width: 627,
        height: 627,
      }));
    }
    return activePack.pictures
      .filter((picture) => picture.localUri)
      .map((picture) => ({
        key: `${activePack.id}-${picture.id}`,
        source: picture.localUri as string,
        pt: picture.titlePt,
        en: picture.titleEn,
        width: picture.width,
        height: picture.height,
      }));
  }, [activePack, ageGroup]);
  const updateInstalledPacks = useCallback((packs: ImagePack[]) => {
    setInstalledPacks(packs);
    setActiveGalleryId((current) =>
      current === BUILT_IN_GALLERY_ID || packs.some((pack) => pack.id === current)
        ? current
        : BUILT_IN_GALLERY_ID,
    );
    setKidCarouselIndex(0);
  }, []);

  useEffect(() => {
    void getInstalledImagePacks().then(updateInstalledPacks);
  }, [updateInstalledPacks]);
  const resolvedOrientation = resolvePuzzleOrientation(
    "automatic",
    imageDimensions?.width,
    imageDimensions?.height,
  );

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        t("Permissão necessária", "Permission required"),
        t(
          "Permita o acesso às fotos para criar um quebra-cabeça.",
          "Allow photo access to create a puzzle.",
        ),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      preferredAssetRepresentationMode:
        Platform.OS === "ios"
          ? ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current
          : undefined,
      presentationStyle:
        Platform.OS === "ios" ? ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN : undefined,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    try {
      let permanentUri = asset.uri;
      if (Platform.OS !== "web") {
        const directory = new Directory(Paths.document, "puzzle-images");
        directory.create({ idempotent: true, intermediates: true });
        const longestSide = Math.max(asset.width, asset.height);
        const resizeScale = Math.min(1, 2048 / Math.max(1, longestSide));
        const optimized = await ImageManipulator.manipulateAsync(
          asset.uri,
          resizeScale < 1
            ? [
                {
                  resize: {
                    width: Math.max(1, Math.round(asset.width * resizeScale)),
                    height: Math.max(1, Math.round(asset.height * resizeScale)),
                  },
                },
              ]
            : [],
          {
            compress: 0.88,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );
        const destination = new File(directory, `puzzle-${Date.now()}.jpg`);
        await new File(optimized.uri).copy(destination, { overwrite: true });
        permanentUri = destination.uri;
      }
      setImageUri(permanentUri);
      setSelectedKidPicture(null);
      const dimensions = { width: asset.width, height: asset.height };
      setImageDimensions(dimensions);
      const nextOrientation = resolvePuzzleOrientation(
        "automatic",
        dimensions.width,
        dimensions.height,
      );
      setConfiguration((current) => {
        const grid = orientPuzzleGrid(current.rows, current.columns, nextOrientation);
        return { ...current, ...grid, totalPieces: grid.rows * grid.columns };
      });
      setName(asset.fileName?.replace(/\.[^.]+$/, "") ?? t("Minha memória", "My memory"));
      if (preferences.haptics) await Haptics.selectionAsync();
    } catch {
      showAlert(
        t("Não foi possível salvar a foto", "Could not save the photo"),
        t(
          "Escolha a imagem novamente ou confira a permissão da galeria.",
          "Choose the image again or check photo permissions.",
        ),
      );
    }
  }

  async function chooseKidPicture(item: KidPicture) {
    try {
      let sourceUri: string;
      let sourceWidth = item.width;
      let sourceHeight = item.height;
      if (typeof item.source === "number") {
        const asset = Asset.fromModule(item.source);
        if (!asset.localUri && /^https?:\/\//.test(asset.uri)) await asset.downloadAsync();
        sourceUri = asset.localUri ?? asset.uri;
        sourceWidth = asset.width ?? item.width;
        sourceHeight = asset.height ?? item.height;
      } else {
        sourceUri = item.source;
      }
      const directory = new Directory(Paths.document, "puzzle-images");
      directory.create({ idempotent: true, intermediates: true });
      const pictureKey = item.key.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-");
      const sourceExtension = sourceUri.split("?")[0].split(".").pop()?.toLowerCase();
      const embeddedAndroidResource = sourceUri.startsWith("file:///android_res/");
      const canCopy =
        !embeddedAndroidResource &&
        (sourceUri.startsWith("file://") || sourceUri.startsWith("content://"));
      let permanentUri = sourceUri;
      if (canCopy) {
        const destination = new File(
          directory,
          `preset-${pictureKey}.${sourceExtension && /^[a-z0-9]{2,5}$/.test(sourceExtension) ? sourceExtension : "jpg"}`,
        );
        await new File(sourceUri).copy(destination, { overwrite: true });
        permanentUri = destination.uri;
      }
      setImageUri(permanentUri);
      setSelectedKidPicture(item.key);
      setImageDimensions({ width: sourceWidth, height: sourceHeight });
      setName(t(item.pt, item.en));
      setDifficulty("custom");
      setConfiguration((current) => {
        const side = Math.max(2, Math.round(Math.sqrt(current.totalPieces)));
        return { ...current, rows: side, columns: side, totalPieces: side * side };
      });
      if (preferences.haptics) await Haptics.selectionAsync();
    } catch {
      showAlert(
        t("Não foi possível abrir a imagem", "Couldn't open the picture"),
        t("Tente novamente.", "Try again."),
      );
    }
  }

  function selectPreset(preset: (typeof presets)[number]) {
    const grid = orientPuzzleGrid(preset.rows, preset.columns, resolvedOrientation);
    setDifficulty(preset.id);
    setConfiguration((current) => ({
      ...current,
      ...grid,
      totalPieces: preset.pieces,
    }));
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function toggle(
    key: keyof Pick<
      PuzzleConfiguration,
      "rotationEnabled" | "hintsEnabled" | "referenceEnabled" | "timerEnabled"
    >,
  ) {
    setConfiguration((current) => ({ ...current, [key]: !current[key] }));
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  function startPuzzle() {
    if (!imageUri) return;
    const puzzle = createPuzzle({
      name: name.trim() || t("Minha memória", "My memory"),
      imageUri,
      difficulty,
      configuration,
    });
    if (preferences.haptics)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/puzzle/${puzzle.id}`);
  }

  function toggleStep(step: keyof typeof expandedSteps) {
    setExpandedSteps((current) => ({ ...current, [step]: !current[step] }));
    if (preferences.haptics) void Haptics.selectionAsync();
  }

  return (
    <Screen>
      <AppHeader title={t("Novo quebra-cabeça", "New Puzzle")} showTitle />

      <CollapsibleStepCard
        step="1"
        title={t("Escolha uma foto", "Choose a photo")}
        subtitle={t("Ela continua somente no seu aparelho.", "It stays only on your device.")}
        expanded={expandedSteps.photo}
        onToggle={() => toggleStep("photo")}
      >
        {availableKidPictures.length ? (
          <View style={styles.kidGallery}>
            {compatibleInstalledPacks.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.galleryTabs}
                contentContainerStyle={styles.galleryTabsContent}
              >
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: visibleGalleryId === BUILT_IN_GALLERY_ID }}
                  onPress={() => {
                    setActiveGalleryId(BUILT_IN_GALLERY_ID);
                    setKidCarouselIndex(0);
                  }}
                  style={[
                    styles.galleryTab,
                    {
                      backgroundColor:
                        visibleGalleryId === BUILT_IN_GALLERY_ID
                          ? colors.primary
                          : colors.panelAlt,
                      borderColor:
                        visibleGalleryId === BUILT_IN_GALLERY_ID
                          ? colors.primary
                          : `${colors.accent}45`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.galleryTabText,
                      {
                        color:
                          visibleGalleryId === BUILT_IN_GALLERY_ID
                            ? colors.background
                            : colors.text,
                      },
                    ]}
                  >
                    {t("Inicial", "Starter")}
                  </Text>
                </Pressable>
                {compatibleInstalledPacks.map((pack) => {
                  const selected = activeGalleryId === pack.id;
                  return (
                    <Pressable
                      key={pack.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setActiveGalleryId(pack.id);
                        setKidCarouselIndex(0);
                      }}
                      style={[
                        styles.galleryTab,
                        {
                          backgroundColor: selected ? colors.primary : colors.panelAlt,
                          borderColor: selected ? colors.primary : `${colors.accent}45`,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.galleryTabText,
                          { color: selected ? colors.background : colors.text },
                        ]}
                      >
                        {t(pack.titlePt, pack.titleEn)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <View style={styles.kidHeading}>
              <Ionicons name="sparkles" size={19} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.kidTitle, { color: colors.text }]}> 
                  {activePack
                    ? t(activePack.titlePt, activePack.titleEn)
                    : ageGroup === "child"
                      ? t("Escolha uma aventura", "Choose an adventure")
                      : t("Coleção inicial", "Starter collection")}
                </Text>
                <Text style={[styles.kidSwipeHint, { color: colors.muted }]}> 
                  {activePack
                    ? `${availableKidPictures.length} ${t("imagens", "pictures")} · ${t("deslize para explorar", "swipe to explore")}`
                    : ageGroup === "child"
                      ? t("Deslize para ver mais imagens", "Swipe to see more pictures")
                      : t(
                          "8 imagens inclusas · deslize para explorar",
                          "8 included pictures · swipe to explore",
                        )}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
            </View>
            <FlatList
              key={visibleGalleryId}
              data={availableKidPictures}
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              disableIntervalMomentum
              snapToAlignment="start"
              snapToInterval={kidCarouselStep}
              style={styles.kidCarousel}
              contentContainerStyle={styles.kidGalleryContent}
              keyExtractor={(item) => item.key}
              onMomentumScrollEnd={(event) => {
                setKidCarouselIndex(
                  Math.max(
                    0,
                    Math.min(
                      availableKidPictures.length - 1,
                      Math.round(event.nativeEvent.contentOffset.x / kidCarouselStep),
                    ),
                  ),
                );
              }}
              renderItem={({ item }) => {
                const selected = selectedKidPicture === item.key;
                return (
                  <View
                    style={[
                      styles.kidPictureShell,
                      {
                        width: kidCardWidth,
                        borderColor: selected ? colors.primary : `${colors.accent}35`,
                        backgroundColor: `${colors.panelAlt}a8`,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => void chooseKidPicture(item)}
                      style={styles.kidPicture}
                    >
                      <Image source={item.source} style={styles.kidImage} contentFit="cover" />
                      <View style={styles.kidCardFooter}>
                        <Text numberOfLines={2} style={[styles.kidName, { color: colors.text }]}>
                          {t(item.pt, item.en)}
                        </Text>
                        <View
                          style={[
                            styles.kidSelectIcon,
                            { backgroundColor: selected ? colors.primary : colors.panelAlt },
                          ]}
                        >
                          <Ionicons
                            name={selected ? "checkmark" : "add"}
                            size={18}
                            color={selected ? colors.background : colors.accent}
                          />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              }}
            />
            <View style={styles.kidPagination}>
              {availableKidPictures.map((item, index) => (
                <View
                  key={item.key}
                  style={[
                    styles.kidDot,
                    {
                      width: index === kidCarouselIndex ? 22 : 7,
                      backgroundColor:
                        index === kidCarouselIndex ? colors.accent : `${colors.muted}55`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => setShowPackLibrary(true)}
          style={[
            styles.packLibraryButton,
            { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}55` },
          ]}
        >
          <View style={[styles.packLibraryIcon, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="gift-outline" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.packLibraryTitle, { color: colors.text }]}>
              {ageGroup === "child"
                ? t("Novas aventuras", "New adventures")
                : t("Explorar pacotes prontos", "Explore ready-made packs")}
            </Text>
            <Text style={[styles.packLibraryMeta, { color: colors.muted }]}>
              {installedPacks.length
                ? `${installedPacks.length} ${t("pacotes disponíveis offline", "packs available offline")}`
                : t(
                    "Pacotes gratuitos e pagos, sem atualizar o app",
                    "Free and paid packs, no app update needed",
                  )}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </Pressable>
        <View style={styles.orDivider}>
          <View style={[styles.orLine, { backgroundColor: `${colors.muted}28` }]} />
          <Text style={[styles.orText, { color: colors.muted }]}>
            {t("OU USE UMA FOTO", "OR USE A PHOTO")}
          </Text>
          <View style={[styles.orLine, { backgroundColor: `${colors.muted}28` }]} />
        </View>

        {imageUri ? (
          <View className="gap-3">
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                aspectRatio: configuration.columns / configuration.rows,
                borderRadius: 18,
                backgroundColor: colors.panelAlt,
              }}
              contentFit="cover"
              transition={220}
            />
            <View
              style={[
                styles.detectedFormat,
                {
                  backgroundColor: `${colors.accent}12`,
                  borderColor: `${colors.accent}42`,
                  borderRadius: Math.max(11, colors.radius - 2),
                },
              ]}
            >
              <View style={[styles.detectedFormatIcon, { backgroundColor: `${colors.accent}1c` }]}>
                <Ionicons
                  name={
                    resolvedOrientation === "portrait"
                      ? "phone-portrait-outline"
                      : "phone-landscape-outline"
                  }
                  size={22}
                  color={colors.accent}
                />
              </View>
              <View style={styles.detectedFormatCopy}>
                <Text style={[styles.detectedFormatTitle, { color: colors.text }]}>
                  {t("Formato detectado automaticamente", "Format detected automatically")}
                </Text>
                <Text style={[styles.detectedFormatMeta, { color: colors.muted }]}>
                  {resolvedOrientation === "portrait"
                    ? t("Foto vertical · tabuleiro ajustado", "Portrait photo · board adjusted")
                    : t("Foto horizontal · tabuleiro ajustado", "Landscape photo · board adjusted")}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("Nome do quebra-cabeça", "Puzzle name")}
              placeholderTextColor={colors.muted}
              className="min-h-14 rounded-2xl border px-4 text-base font-bold"
              style={{
                color: colors.text,
                backgroundColor: colors.panelAlt,
                borderColor: `${colors.accent}38`,
              }}
            />
            <SecondaryButton icon="images-outline" onPress={choosePhoto}>
              {t("Trocar foto", "Change photo")}
            </SecondaryButton>
          </View>
        ) : (
          <Pressable
            className="min-h-52 items-center justify-center gap-3 rounded-[22px] border border-dashed px-5 active:scale-[0.99]"
            style={{ borderColor: `${colors.accent}66`, backgroundColor: colors.panelAlt }}
            onPress={choosePhoto}
          >
            <View
              className="h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${colors.primary}24` }}
            >
              <Ionicons name="image-outline" size={30} color={colors.accent} />
            </View>
            <Text className="text-center text-lg font-black" style={{ color: colors.text }}>
              {t("Abrir galeria", "Open photo library")}
            </Text>
            <MutedText className="text-center">
              {t(
                "A orientação original será detectada",
                "The original orientation will be detected",
              )}
            </MutedText>
          </Pressable>
        )}
      </CollapsibleStepCard>

      <CollapsibleStepCard
        step="2"
        title={t("Escolha a dificuldade", "Choose difficulty")}
        subtitle={`${configuration.totalPieces} ${t("peças", "pieces")}`}
        expanded={expandedSteps.difficulty}
        onToggle={() => toggleStep("difficulty")}
      >
        <DifficultySlider
          selectedIndex={Math.max(
            0,
            presets.findIndex((preset) => preset.id === selectedPreset?.id),
          )}
          orientation={resolvedOrientation}
          onSelect={(index) => selectPreset(presets[index] ?? presets[0])}
        />
      </CollapsibleStepCard>

      <CollapsibleStepCard
        step="3"
        title={t("Opções da partida", "Game options")}
        subtitle={t("Rotação, dicas, referência e tempo", "Rotation, hints, reference and time")}
        expanded={expandedSteps.options}
        onToggle={() => toggleStep("options")}
      >
        <OptionRow
          icon="sync-outline"
          title={t("Rotação das peças", "Piece rotation")}
          subtitle={t("Toque duas vezes para girar", "Double tap to rotate")}
          value={configuration.rotationEnabled}
          onChange={() => toggle("rotationEnabled")}
        />
        <OptionRow
          icon="bulb-outline"
          title={t("Dicas", "Hints")}
          subtitle={t("Ajuda quando você precisar", "Help when you need it")}
          value={configuration.hintsEnabled}
          onChange={() => toggle("hintsEnabled")}
        />
        <OptionRow
          icon="eye-outline"
          title={t("Imagem de referência", "Reference image")}
          subtitle={t("Consulte a foto durante o jogo", "View the photo while playing")}
          value={configuration.referenceEnabled}
          onChange={() => toggle("referenceEnabled")}
        />
        <OptionRow
          icon="timer-outline"
          title={t("Cronômetro", "Timer")}
          subtitle={t("Acompanhe seu tempo", "Track your time")}
          value={configuration.timerEnabled}
          onChange={() => toggle("timerEnabled")}
        />
      </CollapsibleStepCard>

      <PrimaryButton icon="play" onPress={startPuzzle} disabled={!imageUri}>
        {t("Criar e começar", "Create and start")}
      </PrimaryButton>
      <ImagePackLibrary
        visible={showPackLibrary}
        onClose={() => setShowPackLibrary(false)}
        onInstalledChange={updateInstalledPacks}
      />
    </Screen>
  );
}
