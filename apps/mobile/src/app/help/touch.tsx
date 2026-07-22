import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, Screen } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

const gestures = [
  ["hand-left-outline", "Arrastar peça", "Toque e arraste para mover uma peça livre pelo tabuleiro.", "Drag piece", "Touch and drag to move a loose piece around the board."],
  ["sync-outline", "Dois toques", "Toque duas vezes rapidamente em uma peça para girá-la 90 graus.", "Double tap", "Quickly tap a piece twice to rotate it 90 degrees."],
  ["resize-outline", "Pinça para zoom", "Aproxime ou afaste dois dedos para controlar o zoom.", "Pinch to zoom", "Pinch two fingers together or apart to control zoom."],
  ["move-outline", "Mover tabuleiro", "Com o zoom ativo, arraste uma área vazia para explorar o tabuleiro.", "Pan board", "While zoomed in, drag an empty area to explore the board."],
  ["chevron-up-outline", "Bandeja de peças", "Deslize a bandeja inferior para cima ou para baixo para abrir e fechar.", "Piece tray", "Swipe the bottom tray up or down to open and close it."],
] as const;

export default function TouchHelpScreen() {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <Screen>
      <AppHeader title={t("Gestos touch", "Touch gestures")} showTitle back />
      <Text style={[styles.intro, { color: colors.muted }]}>{t("Use gestos naturais para montar o puzzle sem cobrir os controles da tela.", "Use natural gestures to assemble the puzzle without covering on-screen controls.")}</Text>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {gestures.map(([icon, ptTitle, ptDescription, enTitle, enDescription], index) => (
          <View key={ptTitle} style={[styles.row, { borderBottomColor: `${colors.muted}28`, borderBottomWidth: index === gestures.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
            <View style={[styles.gestureIcon, { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}55` }]}><Ionicons name={icon} size={25} color={colors.accent} /></View>
            <View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{t(ptTitle, enTitle)}</Text><Text style={[styles.description, { color: colors.muted }]}>{t(ptDescription, enDescription)}</Text></View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  row: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 15, paddingVertical: 12 },
  gestureIcon: { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: "Inter_700Bold", fontSize: 15 },
  description: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
});
