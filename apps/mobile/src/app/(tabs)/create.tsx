import { Ionicons } from "@expo/vector-icons";
import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import { BrandHeader, Card, Label, MutedText, PrimaryButton, Screen, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

const presets = [
  { id: "beginner" as const, rows: 3, columns: 4, pieces: 12 },
  { id: "easy" as const, rows: 4, columns: 6, pieces: 24 },
  { id: "normal" as const, rows: 6, columns: 8, pieces: 48 },
  { id: "medium" as const, rows: 8, columns: 12, pieces: 96 },
];

export default function CreateScreen() {
  const { createPuzzle, t, theme } = useApp();
  const colors = mobileThemes[theme];
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("normal");
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
    () => presets.find((preset) => preset.rows === configuration.rows && preset.columns === configuration.columns),
    [configuration.columns, configuration.rows],
  );

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("Permissão necessária", "Permission required"),
        t("Permita o acesso às fotos para criar um quebra-cabeça.", "Allow photo access to create a puzzle."),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    try {
      let permanentUri = asset.uri;
      if (Platform.OS !== "web") {
        const directory = new Directory(Paths.document, "puzzle-images");
        directory.create({ idempotent: true, intermediates: true });
        const extension = asset.fileName?.split(".").pop()?.toLowerCase() || "jpg";
        const destination = new File(directory, `puzzle-${Date.now()}.${extension}`);
        await new File(asset.uri).copy(destination, { overwrite: true });
        permanentUri = destination.uri;
      }
      setImageUri(permanentUri);
      setName(asset.fileName?.replace(/\.[^.]+$/, "") ?? t("Minha memória", "My memory"));
      await Haptics.selectionAsync();
    } catch {
      Alert.alert(
        t("Não foi possível salvar a foto", "Could not save the photo"),
        t("Escolha a imagem novamente ou confira a permissão da galeria.", "Choose the image again or check photo permissions."),
      );
    }
  }

  function selectPreset(preset: (typeof presets)[number]) {
    setDifficulty(preset.id);
    setConfiguration((current) => ({
      ...current,
      rows: preset.rows,
      columns: preset.columns,
      totalPieces: preset.pieces,
    }));
    void Haptics.selectionAsync();
  }

  function toggle(key: keyof Pick<PuzzleConfiguration, "rotationEnabled" | "hintsEnabled" | "referenceEnabled" | "timerEnabled">) {
    setConfiguration((current) => ({ ...current, [key]: !current[key] }));
    void Haptics.selectionAsync();
  }

  function startPuzzle() {
    if (!imageUri) return;
    const puzzle = createPuzzle({
      name: name.trim() || t("Minha memória", "My memory"),
      imageUri,
      difficulty,
      configuration,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/puzzle/${puzzle.id}`);
  }

  return (
    <Screen>
      <BrandHeader
        eyebrow={t("NOVO DESAFIO", "NEW CHALLENGE")}
        title={t("Crie seu puzzle", "Create your puzzle")}
        description={t("Todas as opções ficam visíveis para você decidir antes de começar.", "Every option is visible so you can decide before starting.")}
      />

      <Card className="mb-4 gap-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.panelAlt }}>
            <Text className="font-black" style={{ color: colors.accent }}>1</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black" style={{ color: colors.text }}>{t("Escolha uma foto", "Choose a photo")}</Text>
            <MutedText>{t("Ela continua somente no seu aparelho.", "It stays only on your device.")}</MutedText>
          </View>
        </View>

        {imageUri ? (
          <View className="gap-3">
            <Image source={{ uri: imageUri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 18 }} contentFit="cover" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("Nome do quebra-cabeça", "Puzzle name")}
              placeholderTextColor={colors.muted}
              className="min-h-14 rounded-2xl border px-4 text-base font-bold"
              style={{ color: colors.text, backgroundColor: colors.panelAlt, borderColor: `${colors.accent}38` }}
            />
            <SecondaryButton icon="images-outline" onPress={choosePhoto}>{t("Trocar foto", "Change photo")}</SecondaryButton>
          </View>
        ) : (
          <Pressable className="min-h-52 items-center justify-center gap-3 rounded-[22px] border border-dashed px-5 active:scale-[0.99]" style={{ borderColor: `${colors.accent}66`, backgroundColor: colors.panelAlt }} onPress={choosePhoto}>
            <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${colors.primary}24` }}>
              <Ionicons name="image-outline" size={30} color={colors.accent} />
            </View>
            <Text className="text-center text-lg font-black" style={{ color: colors.text }}>{t("Abrir galeria", "Open photo library")}</Text>
            <MutedText className="text-center">{t("Selecione e recorte sua imagem", "Select and crop your image")}</MutedText>
          </Pressable>
        )}
      </Card>

      <Card className="mb-4 gap-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.panelAlt }}><Text className="font-black" style={{ color: colors.accent }}>2</Text></View>
          <View className="flex-1">
            <Text className="text-lg font-black" style={{ color: colors.text }}>{t("Escolha a dificuldade", "Choose difficulty")}</Text>
            <MutedText>{configuration.totalPieces} {t("peças", "pieces")}</MutedText>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {presets.map((preset) => {
            const selected = selectedPreset?.id === preset.id;
            return (
              <Pressable key={preset.id} className="min-w-[47%] flex-1 rounded-2xl border p-4 active:scale-[0.98]" style={{ borderColor: selected ? colors.accent : `${colors.accent}25`, backgroundColor: selected ? `${colors.accent}18` : colors.panelAlt }} onPress={() => selectPreset(preset)}>
                <Text className="text-xl font-black" style={{ color: selected ? colors.accent : colors.text }}>{preset.pieces}</Text>
                <MutedText>{preset.rows} × {preset.columns}</MutedText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card className="mb-5 gap-1">
        <View className="mb-3 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.panelAlt }}><Text className="font-black" style={{ color: colors.accent }}>3</Text></View>
          <View className="flex-1">
            <Text className="text-lg font-black" style={{ color: colors.text }}>{t("Opções da partida", "Game options")}</Text>
            <MutedText>{t("Tudo pronto e visível de cara.", "Everything ready and visible right away.")}</MutedText>
          </View>
        </View>
        <OptionRow icon="sync-outline" title={t("Rotação das peças", "Piece rotation")} subtitle={t("Toque duas vezes para girar", "Double tap to rotate")} value={configuration.rotationEnabled} onChange={() => toggle("rotationEnabled")} />
        <OptionRow icon="bulb-outline" title={t("Dicas", "Hints")} subtitle={t("Ajuda quando você precisar", "Help when you need it")} value={configuration.hintsEnabled} onChange={() => toggle("hintsEnabled")} />
        <OptionRow icon="eye-outline" title={t("Imagem de referência", "Reference image")} subtitle={t("Consulte a foto durante o jogo", "View the photo while playing")} value={configuration.referenceEnabled} onChange={() => toggle("referenceEnabled")} />
        <OptionRow icon="timer-outline" title={t("Cronômetro", "Timer")} subtitle={t("Acompanhe seu tempo", "Track your time")} value={configuration.timerEnabled} onChange={() => toggle("timerEnabled")} />
      </Card>

      <PrimaryButton icon="play" onPress={startPuzzle} disabled={!imageUri}>{t("Criar e começar", "Create and start")}</PrimaryButton>
    </Screen>
  );
}

function OptionRow({ icon, title, subtitle, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; value: boolean; onChange: () => void }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View className="min-h-[76px] flex-row items-center gap-3 border-b py-3" style={{ borderBottomColor: `${colors.accent}16` }}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panelAlt }}><Ionicons name={icon} size={21} color={colors.accent} /></View>
      <View className="flex-1"><Label>{title}</Label><MutedText>{subtitle}</MutedText></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.panelAlt, true: `${colors.accent}99` }} thumbColor={value ? colors.accent : colors.muted} />
    </View>
  );
}
