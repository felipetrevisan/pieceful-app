export type SupportedAppLanguage = "pt-BR" | "en";

export function resolveDeviceLanguage(
  languageCode: string | null | undefined,
): SupportedAppLanguage {
  return languageCode?.toLowerCase().split("-")[0] === "pt" ? "pt-BR" : "en";
}
