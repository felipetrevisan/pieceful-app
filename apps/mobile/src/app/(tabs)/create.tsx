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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ImagePackLibrary } from "@/components/kid-pack-library";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import {
  AppHeader,
  Card,
  Label,
  MutedText,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { getInstalledImagePacks, type ImagePack } from "@/services/image-packs";
import { useApp } from "@/state/app-provider";

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

const difficultyLabels: Record<PuzzleDifficulty, [string, string]> = {
  beginner: ["Iniciante", "Beginner"],
  easy: ["Fácil", "Easy"],
  normal: ["Normal", "Normal"],
  medium: ["Médio", "Medium"],
  hard: ["Difícil", "Hard"],
  advanced: ["Avançado", "Advanced"],
  master: ["Mestre", "Master"],
  legendary: ["Lendário", "Legendary"],
  custom: ["Personalizado", "Custom"],
};

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
  const availableKidPictures = useMemo<KidPicture[]>(
    () => [
      ...(ageGroup === "child" ? kidPictures : starterPictures).map((picture) => ({
        ...picture,
        key: `built-in-${picture.en}`,
        width: 627,
        height: 627,
      })),
      ...installedPacks
        .filter((pack) =>
          pack.audience
            ? pack.audience === "all" || pack.audience === ageGroup
            : ageGroup === "child",
        )
        .flatMap((pack) =>
          pack.pictures
            .filter((picture) => picture.localUri)
            .map((picture) => ({
              key: `${pack.id}-${picture.id}`,
              source: picture.localUri as string,
              pt: picture.titlePt,
              en: picture.titleEn,
              width: picture.width,
              height: picture.height,
            })),
        ),
    ],
    [ageGroup, installedPacks],
  );
  const updateInstalledPacks = useCallback((packs: ImagePack[]) => setInstalledPacks(packs), []);

  useEffect(() => {
    void getInstalledImagePacks().then(setInstalledPacks);
  }, []);
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
            ? [{
                resize: {
                  width: Math.max(1, Math.round(asset.width * resizeScale)),
                  height: Math.max(1, Math.round(asset.height * resizeScale)),
                },
              }]
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
            <View style={styles.kidHeading}>
              <Ionicons name="sparkles" size={19} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.kidTitle, { color: colors.text }]}>
                  {ageGroup === "child"
                    ? t("Escolha uma aventura", "Choose an adventure")
                    : t("Coleção inicial", "Starter collection")}
                </Text>
                <Text style={[styles.kidSwipeHint, { color: colors.muted }]}>
                  {ageGroup === "child"
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

function CollapsibleStepCard({
  children,
  expanded,
  onToggle,
  step,
  subtitle,
  title,
}: {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  step: string;
  subtitle: string;
  title: string;
}) {
  const { preferences, theme } = useApp();
  const colors = mobileThemes[theme];
  const chevronProgress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    chevronProgress.set(
      preferences.reducedMotion
        ? expanded
          ? 1
          : 0
        : withTiming(expanded ? 1 : 0, { duration: 220 }),
    );
  }, [chevronProgress, expanded, preferences.reducedMotion]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronProgress.value * 180}deg` }],
  }));

  return (
    <Animated.View
      layout={
        preferences.reducedMotion
          ? undefined
          : LinearTransition.springify().damping(18).stiffness(180)
      }
      style={styles.stepCardWrap}
    >
      <Card style={styles.collapsibleCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title}. ${subtitle}`}
          android_ripple={{ color: `${colors.accent}18` }}
          onPress={onToggle}
          style={styles.stepHeader}
        >
          <View style={[styles.stepNumber, { backgroundColor: colors.panelAlt }]}>
            <Text style={[styles.stepNumberText, { color: colors.accent }]}>{step}</Text>
          </View>
          <View style={styles.stepHeadingCopy}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
            <Text numberOfLines={2} style={[styles.stepSubtitle, { color: colors.muted }]}>
              {subtitle}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.stepChevron,
              { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}35` },
              chevronStyle,
            ]}
          >
            <Ionicons name="chevron-down" size={20} color={colors.accent} />
          </Animated.View>
        </Pressable>

        {expanded ? (
          <Animated.View
            entering={preferences.reducedMotion ? undefined : FadeIn.duration(220)}
            exiting={preferences.reducedMotion ? undefined : FadeOut.duration(150)}
            style={styles.stepContent}
          >
            {children}
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stepCardWrap: { width: "100%", marginBottom: 16 },
  collapsibleCard: { padding: 0 },
  stepHeader: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
    overflow: "hidden",
  },
  stepNumber: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  stepHeadingCopy: { flex: 1, minWidth: 0 },
  stepTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 18 },
  stepSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  stepChevron: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContent: { gap: 14, paddingHorizontal: 18, paddingBottom: 18 },
  kidGallery: { gap: 12 },
  kidHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  kidTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 19 },
  kidSwipeHint: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 2 },
  kidCarousel: { marginHorizontal: -20, overflow: "visible" },
  kidGalleryContent: { paddingHorizontal: 20, paddingRight: 48, gap: 12 },
  kidPictureShell: { borderRadius: 24, borderWidth: 2, overflow: "hidden" },
  kidPicture: { width: "100%", padding: 8 },
  kidImage: { width: "100%", aspectRatio: 1.45, borderRadius: 17 },
  kidCardFooter: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 3,
  },
  kidName: { flex: 1, minWidth: 0, fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 18 },
  kidSelectIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  kidPagination: {
    height: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  kidDot: { height: 7, borderRadius: 99 },
  packLibraryButton: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  packLibraryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  packLibraryTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 15 },
  packLibraryMeta: { fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14, marginTop: 2 },
  orDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.1 },
  detectedFormat: {
    minHeight: 68,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectedFormatIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  detectedFormatCopy: { flex: 1, minWidth: 0 },
  detectedFormatTitle: { fontFamily: "BricolageGrotesque_700Bold", fontSize: 14 },
  detectedFormatMeta: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 2 },
  difficultyHero: {
    minHeight: 112,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  difficultyHeroIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "rgba(5,12,28,.28)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  difficultyHeroCopy: { flex: 1, minWidth: 0 },
  difficultyHeroLabel: { color: "#08111f", fontFamily: "BricolageGrotesque_700Bold", fontSize: 22 },
  difficultyHeroMeta: {
    color: "rgba(8,17,31,.68)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 3,
  },
  difficultyHeroCount: {
    color: "#08111f",
    fontFamily: "BricolageGrotesque_800ExtraBold",
    fontSize: 35,
    lineHeight: 37,
    textAlign: "right",
  },
  difficultyHeroUnit: {
    color: "rgba(8,17,31,.68)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "right",
  },
  slider: { height: 48, justifyContent: "center", marginTop: 3 },
  sliderLine: { position: "absolute", left: 14, right: 14, height: 5, borderRadius: 99 },
  sliderMarks: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sliderMark: { width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  sliderThumb: {
    position: "absolute",
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    padding: 3,
  },
  sliderThumbInner: { flex: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sliderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -2,
  },
  sliderEndpoint: { fontFamily: "Inter_700Bold", fontSize: 11 },
  sliderHint: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
});

function DifficultySlider({
  selectedIndex,
  orientation,
  onSelect,
}: {
  selectedIndex: number;
  orientation: ReturnType<typeof resolvePuzzleOrientation>;
  onSelect: (index: number) => void;
}) {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const preset = presets[selectedIndex] ?? presets[0];
  const displayGrid = orientPuzzleGrid(preset.rows, preset.columns, orientation);
  const [ptLabel, enLabel] = difficultyLabels[preset.id];
  const [sliderWidth, setSliderWidth] = useState(0);
  const thumbX = useSharedValue(0);
  const maxIndex = presets.length - 1;

  useEffect(() => {
    if (sliderWidth > 0) {
      thumbX.set(
        withSpring((selectedIndex / maxIndex) * (sliderWidth - 32), {
          damping: 16,
          stiffness: 210,
        }),
      );
    }
  }, [maxIndex, selectedIndex, sliderWidth, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const usableWidth = Math.max(1, sliderWidth - 32);
  const panGesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      thumbX.set(Math.max(0, Math.min(usableWidth, event.x - 16)));
    })
    .onEnd(() => {
      const next = Math.round((thumbX.value / usableWidth) * maxIndex);
      thumbX.set(withSpring((next / maxIndex) * usableWidth, { damping: 15, stiffness: 240 }));
      runOnJS(onSelect)(next);
    });
  const tapGesture = Gesture.Tap().onEnd((event) => {
    const next = Math.round(
      (Math.max(0, Math.min(usableWidth, event.x - 16)) / usableWidth) * maxIndex,
    );
    thumbX.set(withSpring((next / maxIndex) * usableWidth, { damping: 15, stiffness: 240 }));
    runOnJS(onSelect)(next);
  });
  const sliderGesture = Gesture.Race(panGesture, tapGesture);

  function adjust(direction: -1 | 1) {
    onSelect(Math.max(0, Math.min(maxIndex, selectedIndex + direction)));
  }

  return (
    <View style={{ gap: 12 }}>
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.difficultyHero}
      >
        <View style={styles.difficultyHeroIcon}>
          <Ionicons name="speedometer-outline" size={25} color="#08111f" />
        </View>
        <View style={styles.difficultyHeroCopy}>
          <Text numberOfLines={1} style={styles.difficultyHeroLabel}>
            {t(ptLabel, enLabel)}
          </Text>
          <Text style={styles.difficultyHeroMeta}>
            {displayGrid.rows} × {displayGrid.columns} ·{" "}
            {String(selectedIndex + 1).padStart(2, "0")}/{String(presets.length).padStart(2, "0")}
          </Text>
        </View>
        <View>
          <Text style={styles.difficultyHeroCount}>{preset.pieces}</Text>
          <Text style={styles.difficultyHeroUnit}>{t("PEÇAS", "PIECES")}</Text>
        </View>
      </LinearGradient>

      <GestureDetector gesture={sliderGesture}>
        <Animated.View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("Dificuldade do quebra-cabeça", "Puzzle difficulty")}
          accessibilityValue={{
            min: 1,
            max: presets.length,
            now: selectedIndex + 1,
            text: `${t(ptLabel, enLabel)}, ${preset.pieces} ${t("peças", "pieces")}`,
          }}
          accessibilityActions={[
            { name: "increment", label: t("Aumentar dificuldade", "Increase difficulty") },
            { name: "decrement", label: t("Diminuir dificuldade", "Decrease difficulty") },
          ]}
          onAccessibilityAction={(event) =>
            adjust(event.nativeEvent.actionName === "increment" ? 1 : -1)
          }
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
          style={styles.slider}
        >
          <View style={[styles.sliderLine, { backgroundColor: `${colors.muted}38` }]} />
          <View pointerEvents="none" style={styles.sliderMarks}>
            {presets.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.sliderMark,
                  {
                    backgroundColor: index <= selectedIndex ? colors.accent : colors.panelAlt,
                    borderColor: index === selectedIndex ? colors.primary : colors.panel,
                  },
                ]}
              />
            ))}
          </View>
          <Animated.View pointerEvents="none" style={[styles.sliderThumb, thumbStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.sliderThumbInner}
            >
              <Ionicons name="sparkles" size={13} color="#08111f" />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.sliderFooter}>
        <Text style={[styles.sliderEndpoint, { color: colors.muted }]}>12</Text>
        <Text style={[styles.sliderHint, { color: colors.accent }]}>
          {t("ARRASTE PARA AJUSTAR", "DRAG TO ADJUST")}
        </Text>
        <Text style={[styles.sliderEndpoint, { color: colors.muted }]}>1000</Text>
      </View>
    </View>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: () => void;
}) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View
      className="min-h-[76px] flex-row items-center gap-3 border-b py-3"
      style={{ borderBottomColor: `${colors.accent}16` }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: colors.panelAlt }}
      >
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>
      <View className="flex-1">
        <Label>{title}</Label>
        <MutedText>{subtitle}</MutedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.panelAlt, true: `${colors.accent}99` }}
        thumbColor={value ? colors.accent : colors.muted}
      />
    </View>
  );
}
