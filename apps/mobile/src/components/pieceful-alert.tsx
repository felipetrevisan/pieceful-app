import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";

export interface PiecefulAlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface AlertState {
  title: string;
  message?: string;
  buttons: PiecefulAlertButton[];
}

interface PiecefulAlertContextValue {
  showAlert: (title: string, message?: string, buttons?: PiecefulAlertButton[]) => void;
}

const PiecefulAlertContext = createContext<PiecefulAlertContextValue | null>(null);

export function PiecefulAlertProvider({ children }: { children: ReactNode }) {
  const { t, theme } = useApp();
  const colors = mobileThemes[theme];
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: PiecefulAlertButton[]) => {
      setAlert({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: t("Entendi", "Got it") }],
      });
    },
    [t],
  );

  const value = useMemo(() => ({ showAlert }), [showAlert]);
  const destructive = alert?.buttons.some((button) => button.style === "destructive") ?? false;
  const icon = destructive ? "trash-outline" : alert?.buttons.length === 1 ? "sparkles-outline" : "help-circle-outline";

  function dismiss() {
    setAlert(null);
  }

  function select(button: PiecefulAlertButton) {
    dismiss();
    requestAnimationFrame(() => button.onPress?.());
  }

  return (
    <PiecefulAlertContext.Provider value={value}>
      {children}
      <Modal
        animationType="none"
        onRequestClose={dismiss}
        statusBarTranslucent
        transparent
        visible={alert !== null}
      >
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          {Platform.OS === "android" ? (
            <BlurView
              blurMethod="dimezisBlurViewSdk31Plus"
              intensity={45}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Pressable accessibilityLabel={t("Fechar aviso", "Close alert")} onPress={dismiss} style={StyleSheet.absoluteFill} />
          {alert ? (
            <Animated.View
              entering={FadeInDown.duration(280).springify().damping(18)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.panel,
                  borderColor: `${destructive ? colors.danger : colors.accent}70`,
                  borderRadius: Math.max(22, colors.radius),
                },
              ]}
            >
              <LinearGradient
                colors={[`${destructive ? colors.danger : colors.accent}25`, "transparent", `${colors.primary}12`]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.iconHalo, { backgroundColor: `${destructive ? colors.danger : colors.accent}18` }]}>
                <View style={[styles.iconCore, { backgroundColor: `${destructive ? colors.danger : colors.accent}25` }]}>
                  <Ionicons name={icon} size={30} color={destructive ? colors.danger : colors.accent} />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{alert.title}</Text>
              {alert.message ? <Text style={[styles.message, { color: colors.muted }]}>{alert.message}</Text> : null}
              <View style={[styles.actions, alert.buttons.length > 2 ? styles.actionsVertical : null]}>
                {alert.buttons.map((button, index) => {
                  const primary = button.style !== "cancel" && (alert.buttons.length === 1 || index === alert.buttons.length - 1);
                  const danger = button.style === "destructive";
                  const buttonColor = danger ? colors.danger : colors.accent;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={`${button.text}-${index}`}
                      onPress={() => select(button)}
                      style={({ pressed }) => [
                        styles.action,
                        alert.buttons.length > 2 ? styles.actionFull : null,
                        {
                          backgroundColor: primary ? buttonColor : `${colors.panelAlt}e8`,
                          borderColor: primary ? buttonColor : `${colors.muted}35`,
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.actionText, { color: primary ? colors.background : colors.text }]}>{button.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>
      </Modal>
    </PiecefulAlertContext.Provider>
  );
}

export function usePiecefulAlert() {
  const context = useContext(PiecefulAlertContext);
  if (!context) throw new Error("usePiecefulAlert must be used inside PiecefulAlertProvider");
  return context;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, backgroundColor: "rgba(2,5,16,.76)" },
  card: { width: "100%", maxWidth: 430, borderWidth: 1.5, overflow: "hidden", alignItems: "center", paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, shadowColor: "#000", shadowOpacity: .42, shadowRadius: 28, shadowOffset: { width: 0, height: 18 }, elevation: 24 },
  iconHalo: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  iconCore: { width: 58, height: 58, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: 24, lineHeight: 29 },
  message: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  actions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 18 },
  actionsVertical: { flexDirection: "column" },
  action: { flex: 1, minHeight: 52, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  actionFull: { width: "100%", flex: 0 },
  actionText: { textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 14 },
});
