import { DIFFICULTIES } from "@puzzled/shared";
import { router } from "expo-router";
import { Text } from "react-native";
import { AppHeader, PrimaryButton, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { DifficultySlider } from "@/features/tabs/create-controls";
import { styles } from "@/features/tabs/create.styles";
import { useApp } from "@/state/app-provider";
import { useCreateFlow } from "@/state/create-flow-provider";

const presets = DIFFICULTIES;

export default function DifficultyScreen() {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const { resolvedOrientation, selectPreset, selectedPreset } = useCreateFlow();

  return (
    <Screen>
      <AppHeader title={t("Escolha a dificuldade", "Choose difficulty")} showTitle back />
      <Text style={[styles.wizardStep, { color: colors.accent }]}>
        {t("PASSO 2 DE 3 · DIFICULDADE", "STEP 2 OF 3 · DIFFICULTY")}
      </Text>

      <DifficultySlider
        selectedIndex={Math.max(
          0,
          presets.findIndex((preset) => preset.id === selectedPreset?.id),
        )}
        orientation={resolvedOrientation}
        onSelect={(index) => selectPreset(presets[index] ?? presets[0])}
      />

      <PrimaryButton icon="arrow-forward" onPress={() => router.push("/create/options")}>
        {t("Continuar", "Continue")}
      </PrimaryButton>
    </Screen>
  );
}
