import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import PiecefulGameServices from "../../modules/my-module/src/PiecefulGameServicesModule";
import { usePiecefulAlert } from "@/components/pieceful-alert";
import { useApp } from "@/state/app-provider";

export function AppUpdateNotice({ enabled }: { enabled: boolean }) {
  const { showAlert } = usePiecefulAlert();
  const { t } = useApp();
  const checking = useRef(false);
  const prompted = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== "android" || !PiecefulGameServices?.checkForAppUpdate) {
      return;
    }

    async function check() {
      if (checking.current || prompted.current) return;
      checking.current = true;
      try {
        const update = await PiecefulGameServices?.checkForAppUpdate?.();
        if (!update || (!update.available && !update.inProgress)) return;
        prompted.current = true;
        showAlert(
          t("Atualização disponível", "Update available"),
          t(
            "Uma nova versão do Pieceful está pronta. Atualize agora para receber as melhorias e correções mais recentes.",
            "A new Pieceful version is ready. Update now to get the latest improvements and fixes.",
          ),
          [
            { text: t("Depois", "Later"), style: "cancel" },
            {
              text: t("Atualizar agora", "Update now"),
              icon: "download-outline",
              onPress: () => {
                void PiecefulGameServices?.startAppUpdate?.().catch(() => {
                  prompted.current = false;
                  showAlert(
                    t("Não foi possível atualizar", "Couldn't update"),
                    t(
                      "Abra a página do Pieceful na Google Play e tente novamente.",
                      "Open Pieceful on Google Play and try again.",
                    ),
                  );
                });
              },
            },
          ],
        );
      } finally {
        checking.current = false;
      }
    }

    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => subscription.remove();
  }, [enabled, showAlert, t]);

  return null;
}
