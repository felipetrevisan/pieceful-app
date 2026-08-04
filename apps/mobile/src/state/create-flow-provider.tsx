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
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { getInstalledImagePacks, type ImagePack } from "@/services/image-packs";
import { useApp } from "@/state/app-provider";

const presets = DIFFICULTIES;
const kidPictures = [
  {
    source: require("../../assets/images/kids/dinosaur-picnic.png"),
    pt: "Piquenique dos dinos",
    en: "Dino picnic",
  },
  {
    source: require("../../assets/images/kids/happy-space.png"),
    pt: "Viagem espacial",
    en: "Space trip",
  },
  {
    source: require("../../assets/images/kids/ocean-friends.png"),
    pt: "Amigos do oceano",
    en: "Ocean friends",
  },
  {
    source: require("../../assets/images/kids/rainbow-castle.png"),
    pt: "Castelo arco-íris",
    en: "Rainbow castle",
  },
  {
    source: require("../../assets/images/kids/dragon-bakery.png"),
    pt: "Confeitaria dos dragões",
    en: "Dragon bakery",
  },
  {
    source: require("../../assets/images/kids/animal-train.png"),
    pt: "Trem dos animais",
    en: "Animal train",
  },
  {
    source: require("../../assets/images/kids/robot-workshop.png"),
    pt: "Oficina de robôs",
    en: "Robot workshop",
  },
  {
    source: require("../../assets/images/kids/jungle-orchestra.png"),
    pt: "Orquestra da selva",
    en: "Jungle orchestra",
  },
  {
    source: require("../../assets/images/kids/penguin-festival.png"),
    pt: "Festival dos pinguins",
    en: "Penguin festival",
  },
  {
    source: require("../../assets/images/kids/friendly-city.png"),
    pt: "Cidade dos amigos",
    en: "Friendly city",
  },
  {
    source: require("../../assets/images/kids/magical-garden.png"),
    pt: "Jardim encantado",
    en: "Magical garden",
  },
] as const;

const starterPictures = [
  {
    source: require("../../assets/images/starter/aurora-lake.png"),
    pt: "Refúgio sob a aurora",
    en: "Aurora retreat",
  },
  {
    source: require("../../assets/images/starter/neon-metropolis.png"),
    pt: "Metrópole neon",
    en: "Neon metropolis",
  },
  {
    source: require("../../assets/images/starter/mediterranean-coast.png"),
    pt: "Costa mediterrânea",
    en: "Mediterranean coast",
  },
  {
    source: require("../../assets/images/starter/tropical-feathers.png"),
    pt: "Cores tropicais",
    en: "Tropical colors",
  },
  {
    source: require("../../assets/images/starter/desert-oasis.png"),
    pt: "Oásis dourado",
    en: "Golden oasis",
  },
  {
    source: require("../../assets/images/starter/cosmic-voyage.png"),
    pt: "Viagem cósmica",
    en: "Cosmic voyage",
  },
  {
    source: require("../../assets/images/starter/grand-library.png"),
    pt: "Biblioteca encantada",
    en: "Enchanted library",
  },
  {
    source: require("../../assets/images/starter/tropical-waterfall.png"),
    pt: "Jardim das cachoeiras",
    en: "Waterfall garden",
  },
] as const;

export interface KidPicture {
  key: string;
  source: number | string;
  pt: string;
  en: string;
  width: number;
  height: number;
}

const BUILT_IN_GALLERY_ID = "built-in";

const defaultConfiguration: PuzzleConfiguration = {
  rows: 6,
  columns: 8,
  totalPieces: 48,
  rotationEnabled: false,
  hintsEnabled: true,
  referenceEnabled: true,
  timerEnabled: true,
  magnetismEnabled: true,
};

type ToggleableConfigKey = keyof Pick<
  PuzzleConfiguration,
  "rotationEnabled" | "hintsEnabled" | "referenceEnabled" | "timerEnabled" | "magnetismEnabled"
>;

interface CreateFlowState {
  imageUri: string | null;
  name: string;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  kidCarouselIndex: number;
  selectedKidPicture: string | null;
  installedPacks: ImagePack[];
  activeGalleryId: string;
  showPackLibrary: boolean;
  resolvedOrientation: ReturnType<typeof resolvePuzzleOrientation>;
  selectedPreset: (typeof presets)[number] | undefined;
  compatibleInstalledPacks: ImagePack[];
  activePack: ImagePack | null;
  visibleGalleryId: string;
  availableKidPictures: KidPicture[];
  canAdvanceFromPhoto: boolean;
  setName: (name: string) => void;
  setKidCarouselIndex: (index: number) => void;
  setActiveGalleryId: (id: string) => void;
  setShowPackLibrary: (show: boolean) => void;
  choosePhoto: () => Promise<void>;
  chooseKidPicture: (item: KidPicture) => Promise<void>;
  updateInstalledPacks: (packs: ImagePack[]) => void;
  selectPreset: (preset: (typeof presets)[number]) => void;
  toggle: (key: ToggleableConfigKey) => void;
  createAndStart: () => void;
}

const CreateFlowContext = createContext<CreateFlowState | null>(null);

export function CreateFlowProvider({ children }: { children: ReactNode }) {
  const { ageGroup, createPuzzle, preferences, t } = useApp();
  const { showAlert } = usePiecefulAlert();
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
  const [configuration, setConfiguration] = useState<PuzzleConfiguration>(defaultConfiguration);

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

  const choosePhoto = useCallback(async () => {
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
  }, [preferences.haptics, showAlert, t]);

  const chooseKidPicture = useCallback(
    async (item: KidPicture) => {
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
    },
    [preferences.haptics, showAlert, t],
  );

  const selectPreset = useCallback(
    (preset: (typeof presets)[number]) => {
      const grid = orientPuzzleGrid(preset.rows, preset.columns, resolvedOrientation);
      setDifficulty(preset.id);
      setConfiguration((current) => ({
        ...current,
        ...grid,
        totalPieces: preset.pieces,
      }));
      if (preferences.haptics) void Haptics.selectionAsync();
    },
    [preferences.haptics, resolvedOrientation],
  );

  const toggle = useCallback(
    (key: ToggleableConfigKey) => {
      setConfiguration((current) => ({ ...current, [key]: !current[key] }));
      if (preferences.haptics) void Haptics.selectionAsync();
    },
    [preferences.haptics],
  );

  const resetFlow = useCallback(() => {
    setImageUri(null);
    setName("");
    setImageDimensions(null);
    setDifficulty("normal");
    setSelectedKidPicture(null);
    setActiveGalleryId(BUILT_IN_GALLERY_ID);
    setKidCarouselIndex(0);
    setConfiguration(defaultConfiguration);
  }, []);

  const createAndStart = useCallback(() => {
    if (!imageUri) return;
    const puzzle = createPuzzle({
      name: name.trim() || t("Minha memória", "My memory"),
      imageUri,
      difficulty,
      configuration,
    });
    if (preferences.haptics)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetFlow();
    router.push(`/puzzle/${puzzle.id}`);
  }, [configuration, createPuzzle, difficulty, imageUri, name, preferences.haptics, resetFlow, t]);

  const value = useMemo<CreateFlowState>(
    () => ({
      imageUri,
      name,
      difficulty,
      configuration,
      kidCarouselIndex,
      selectedKidPicture,
      installedPacks,
      activeGalleryId,
      showPackLibrary,
      resolvedOrientation,
      selectedPreset,
      compatibleInstalledPacks,
      activePack,
      visibleGalleryId,
      availableKidPictures,
      canAdvanceFromPhoto: imageUri !== null,
      setName,
      setKidCarouselIndex,
      setActiveGalleryId,
      setShowPackLibrary,
      choosePhoto,
      chooseKidPicture,
      updateInstalledPacks,
      selectPreset,
      toggle,
      createAndStart,
    }),
    [
      imageUri,
      name,
      difficulty,
      configuration,
      kidCarouselIndex,
      selectedKidPicture,
      installedPacks,
      activeGalleryId,
      showPackLibrary,
      resolvedOrientation,
      selectedPreset,
      compatibleInstalledPacks,
      activePack,
      visibleGalleryId,
      availableKidPictures,
      choosePhoto,
      chooseKidPicture,
      updateInstalledPacks,
      selectPreset,
      toggle,
      createAndStart,
    ],
  );

  return <CreateFlowContext.Provider value={value}>{children}</CreateFlowContext.Provider>;
}

export function useCreateFlow() {
  const context = useContext(CreateFlowContext);
  if (!context) throw new Error("useCreateFlow must be used inside CreateFlowProvider");
  return context;
}
