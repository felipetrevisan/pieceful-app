import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { FlatList, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ImagePackLibrary } from "@/components/kid-pack-library";
import { AppHeader, MutedText, PrimaryButton, Screen, SecondaryButton } from "@/components/pieceful-ui";
import { mobileThemes } from "@/constants/pieceful-theme";
import { useApp } from "@/state/app-provider";
import { useCreateFlow } from "@/state/create-flow-provider";
import { styles } from "@/features/tabs/create.styles";

const BUILT_IN_GALLERY_ID = "built-in";

export default function CreateScreen() {
  const { ageGroup, t, theme } = useApp();
  const { width } = useWindowDimensions();
  const colors = mobileThemes[theme];
  const kidCardWidth = Math.min(282, width - 92);
  const kidCarouselStep = kidCardWidth + 12;
  const {
    activeGalleryId,
    activePack,
    availableKidPictures,
    canAdvanceFromPhoto,
    chooseKidPicture,
    choosePhoto,
    compatibleInstalledPacks,
    configuration,
    imageUri,
    installedPacks,
    kidCarouselIndex,
    name,
    resolvedOrientation,
    selectedKidPicture,
    setActiveGalleryId,
    setKidCarouselIndex,
    setName,
    setShowPackLibrary,
    showPackLibrary,
    updateInstalledPacks,
    visibleGalleryId,
  } = useCreateFlow();

  return (
    <Screen>
      <AppHeader title={t("Novo quebra-cabeça", "New Puzzle")} showTitle />
      <Text style={[styles.wizardStep, { color: colors.accent }]}>
        {t("PASSO 1 DE 3 · ESCOLHA UMA FOTO", "STEP 1 OF 3 · CHOOSE A PHOTO")}
      </Text>

      {availableKidPictures.length ? (
        <View style={styles.kidGallery}>
          {compatibleInstalledPacks.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryTabs}
              contentContainerStyle={styles.galleryTabsContent}
            >
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: visibleGalleryId === BUILT_IN_GALLERY_ID }}
                onPress={() => {
                  setActiveGalleryId(BUILT_IN_GALLERY_ID);
                  setKidCarouselIndex(0);
                }}
                style={[
                  styles.galleryTab,
                  {
                    backgroundColor:
                      visibleGalleryId === BUILT_IN_GALLERY_ID ? colors.primary : colors.panelAlt,
                    borderColor:
                      visibleGalleryId === BUILT_IN_GALLERY_ID ? colors.primary : `${colors.accent}45`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.galleryTabText,
                    { color: visibleGalleryId === BUILT_IN_GALLERY_ID ? colors.background : colors.text },
                  ]}
                >
                  {t("Inicial", "Starter")}
                </Text>
              </Pressable>
              {compatibleInstalledPacks.map((pack) => {
                const selected = activeGalleryId === pack.id;
                return (
                  <Pressable
                    key={pack.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setActiveGalleryId(pack.id);
                      setKidCarouselIndex(0);
                    }}
                    style={[
                      styles.galleryTab,
                      {
                        backgroundColor: selected ? colors.primary : colors.panelAlt,
                        borderColor: selected ? colors.primary : `${colors.accent}45`,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.galleryTabText, { color: selected ? colors.background : colors.text }]}
                    >
                      {t(pack.titlePt, pack.titleEn)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <View style={styles.kidHeading}>
            <Ionicons name="sparkles" size={19} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kidTitle, { color: colors.text }]}>
                {activePack
                  ? t(activePack.titlePt, activePack.titleEn)
                  : ageGroup === "child"
                    ? t("Escolha uma aventura", "Choose an adventure")
                    : t("Coleção inicial", "Starter collection")}
              </Text>
              <Text style={[styles.kidSwipeHint, { color: colors.muted }]}>
                {activePack
                  ? `${availableKidPictures.length} ${t("imagens", "pictures")} · ${t("deslize para explorar", "swipe to explore")}`
                  : ageGroup === "child"
                    ? t("Deslize para ver mais imagens", "Swipe to see more pictures")
                    : t("8 imagens inclusas · deslize para explorar", "8 included pictures · swipe to explore")}
              </Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
          </View>
          <FlatList
            key={visibleGalleryId}
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
                    backgroundColor: index === kidCarouselIndex ? colors.accent : `${colors.muted}55`,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => setShowPackLibrary(true)}
        style={[styles.packLibraryButton, { backgroundColor: colors.panelAlt, borderColor: `${colors.accent}55` }]}
      >
        <View style={[styles.packLibraryIcon, { backgroundColor: `${colors.accent}20` }]}>
          <Ionicons name="gift-outline" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.packLibraryTitle, { color: colors.text }]}>
            {ageGroup === "child" ? t("Novas aventuras", "New adventures") : t("Explorar pacotes prontos", "Explore ready-made packs")}
          </Text>
          <Text style={[styles.packLibraryMeta, { color: colors.muted }]}>
            {installedPacks.length
              ? `${installedPacks.length} ${t("pacotes disponíveis offline", "packs available offline")}`
              : t("Pacotes gratuitos e pagos, sem atualizar o app", "Free and paid packs, no app update needed")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.accent} />
      </Pressable>
      <View style={styles.orDivider}>
        <View style={[styles.orLine, { backgroundColor: `${colors.muted}28` }]} />
        <Text style={[styles.orText, { color: colors.muted }]}>{t("OU USE UMA FOTO", "OR USE A PHOTO")}</Text>
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
                name={resolvedOrientation === "portrait" ? "phone-portrait-outline" : "phone-landscape-outline"}
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
            style={{ color: colors.text, backgroundColor: colors.panelAlt, borderColor: `${colors.accent}38` }}
          />
          <SecondaryButton icon="images-outline" onPress={() => void choosePhoto()}>
            {t("Trocar foto", "Change photo")}
          </SecondaryButton>
        </View>
      ) : (
        <Pressable
          className="min-h-52 items-center justify-center gap-3 rounded-[22px] border border-dashed px-5 active:scale-[0.99]"
          style={{ borderColor: `${colors.accent}66`, backgroundColor: colors.panelAlt }}
          onPress={() => void choosePhoto()}
        >
          <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${colors.primary}24` }}>
            <Ionicons name="image-outline" size={30} color={colors.accent} />
          </View>
          <Text className="text-center text-lg font-black" style={{ color: colors.text }}>
            {t("Abrir galeria", "Open photo library")}
          </Text>
          <MutedText className="text-center">
            {t("A orientação original será detectada", "The original orientation will be detected")}
          </MutedText>
        </Pressable>
      )}

      <PrimaryButton icon="arrow-forward" onPress={() => router.push("/create/difficulty")} disabled={!canAdvanceFromPhoto}>
        {t("Continuar", "Continue")}
      </PrimaryButton>
      <ImagePackLibrary
        visible={showPackLibrary}
        onClose={() => setShowPackLibrary(false)}
        onInstalledChange={updateInstalledPacks}
      />
    </Screen>
  );
}
