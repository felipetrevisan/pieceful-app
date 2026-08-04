import { router } from "expo-router";
import { Text } from "react-native";
import { AppHeader, PrimaryButton, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { OptionRow } from "@/features/tabs/create-controls";
import { styles } from "@/features/tabs/create.styles";
import { useApp } from "@/state/app-provider";
import { useCreateFlow } from "@/state/create-flow-provider";

export default function OptionsScreen() {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const { canAdvanceFromPhoto, configuration, createAndStart, toggle } = useCreateFlow();

  return (
    <Screen>
      <AppHeader title={t("Opções da partida", "Game options")} showTitle back />
      <Text style={[styles.wizardStep, { color: colors.accent }]}>
        {t("PASSO 3 DE 3 · OPÇÕES", "STEP 3 OF 3 · OPTIONS")}
      </Text>

      <OptionRow
        icon="sync-outline"
        title={t("Rotação das peças", "Piece rotation")}
        subtitle={t("Toque duas vezes para girar", "Double tap to rotate")}
        value={configuration.rotationEnabled}
        onChange={() => toggle("rotationEnabled")}
      />
      <OptionRow
        icon="magnet-outline"
        title={t("Desativar magnetismo", "Disable magnetism")}
        subtitle={t(
          "As peças exigem encaixe manual mais preciso",
          "Pieces require a much more precise manual placement",
        )}
        value={!configuration.magnetismEnabled}
        onChange={() => toggle("magnetismEnabled")}
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

      <PrimaryButton icon="play" onPress={createAndStart} disabled={!canAdvanceFromPhoto}>
        {t("Criar e começar", "Create and start")}
      </PrimaryButton>
    </Screen>
  );
}
