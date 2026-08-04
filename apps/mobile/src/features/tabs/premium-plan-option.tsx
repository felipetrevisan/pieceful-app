import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";
import { styles } from "./settings.styles";

export function Benefit({ text }: { text: string }) {
  const { theme } = useApp();
  const colors = mobileThemes[theme];
  return (
    <View style={styles.benefit}>
      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
      <Text style={[styles.benefitText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

export function PremiumPlanOption({
  plan,
  selected,
  savings,
  colors,
  t,
  onPress,
}: {
  plan: PurchasesPackage;
  selected: boolean;
  savings: number;
  colors: (typeof mobileThemes)[keyof typeof mobileThemes];
  t: (portuguese: string, english: string) => string;
  onPress: () => void;
}) {
  const annual = plan.packageType === "ANNUAL";
  const monthly = plan.packageType === "MONTHLY";
  const title = annual
    ? t("Anual", "Annual")
    : monthly
      ? t("Mensal", "Monthly")
      : plan.product.title;
  const cadence = annual
    ? t("cobrado uma vez por ano", "billed once per year")
    : monthly
      ? t("cobrado todos os meses", "billed every month")
      : t("plano Premium", "Premium plan");
  const monthlyEquivalent = annual ? plan.product.pricePerMonthString : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planOption,
        {
          backgroundColor: selected ? `${colors.accent}1f` : `${colors.panelAlt}c8`,
          borderColor: selected ? colors.accent : `${colors.muted}38`,
          borderRadius: Math.max(18, colors.radius),
        },
        pressed ? styles.pressed : null,
      ]}
    >
      {annual ? (
        <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.planBadgeText, { color: colors.background }]}>
            {savings > 0
              ? t(`ECONOMIZE ${savings}%`, `SAVE ${savings}%`)
              : t("MELHOR VALOR", "BEST VALUE")}
          </Text>
        </View>
      ) : null}
      <View style={styles.planTopRow}>
        <Text style={[styles.planTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.planRadio, { borderColor: selected ? colors.accent : colors.muted }]}>
          {selected ? (
            <View style={[styles.planRadioDot, { backgroundColor: colors.accent }]} />
          ) : null}
        </View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.planPrice, { color: colors.text }]}
      >
        {plan.product.priceString}
      </Text>
      <Text style={[styles.planCadence, { color: colors.muted }]}>{cadence}</Text>
      {monthlyEquivalent ? (
        <Text style={[styles.planEquivalent, { color: colors.accent }]}>
          {t(`${monthlyEquivalent} por mês`, `${monthlyEquivalent} per month`)}
        </Text>
      ) : null}
    </Pressable>
  );
}
