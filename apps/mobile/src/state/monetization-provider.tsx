import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
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
import type { PurchasesOffering, PurchasesStoreProduct } from "react-native-purchases";
import { type MobileTheme, useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";

const PREMIUM_ENTITLEMENT = "premium";
const REWARDED_THEME_STORAGE_KEY = "pieceful:rewarded-theme-unlocks-v1";
const REWARDED_THEME_DURATION = 24 * 60 * 60 * 1000;
const REWARDED_THEMES: MobileTheme[] = ["sunset", "enchanted", "sakura"];
let purchasesConfigured = false;
let purchasesUserId: string | null = null;

interface MonetizationState {
  ready: boolean;
  premium: boolean;
  adsAvailable: boolean;
  purchaseAvailable: boolean;
  offering: PurchasesOffering | null;
  packProducts: Record<string, PurchasesStoreProduct>;
  ownedProductIds: string[];
  error: string | null;
  showRewardedHint: () => Promise<boolean>;
  showRewardedHighlight: () => Promise<boolean>;
  unlockRewardedTheme: (theme: MobileTheme) => Promise<boolean>;
  isRewardedThemeUnlocked: (theme: MobileTheme) => boolean;
  purchasePremium: (packageIdentifier?: string) => Promise<boolean>;
  loadPackProducts: (productIds: string[]) => Promise<void>;
  purchasePack: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const MonetizationContext = createContext<MonetizationState | null>(null);

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { ageGroup, setTheme, theme } = useApp();
  const { session } = useSocial();
  const [ready, setReady] = useState(false);
  const [premium, setPremium] = useState(false);
  const [adsAvailable, setAdsAvailable] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [packProducts, setPackProducts] = useState<Record<string, PurchasesStoreProduct>>({});
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rewardedThemeUnlocks, setRewardedThemeUnlocks] = useState<
    Partial<Record<MobileTheme, number>>
  >({});
  const [themeUnlocksReady, setThemeUnlocksReady] = useState(false);
  const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(REWARDED_THEME_STORAGE_KEY).then((stored) => {
      if (!active) return;
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<Record<MobileTheme, number>>;
          setRewardedThemeUnlocks(
            Object.fromEntries(
              Object.entries(parsed).filter(([, expiresAt]) => Number(expiresAt) > Date.now()),
            ) as Partial<Record<MobileTheme, number>>,
          );
        } catch {
          // A malformed local reward must not prevent the app from starting.
        }
      }
      setThemeUnlocksReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !themeUnlocksReady || premium || !REWARDED_THEMES.includes(theme)) return;
    if ((rewardedThemeUnlocks[theme] ?? 0) > Date.now()) return;
    setTheme(ageGroup === "child" ? "candy" : "cosmic");
  }, [ageGroup, premium, ready, rewardedThemeUnlocks, setTheme, theme, themeUnlocksReady]);

  useEffect(() => {
    if (!ageGroup) return;
    let active = true;
    void (async () => {
      setError(null);
      if (Platform.OS === "android" && Constants.appOwnership !== "expo") {
        try {
          const ads = await import("react-native-google-mobile-ads");
          await ads.default().setRequestConfiguration({
            tagForChildDirectedTreatment: ageGroup === "child",
            tagForUnderAgeOfConsent: ageGroup !== "adult",
            maxAdContentRating:
              ageGroup === "child"
                ? ads.MaxAdContentRating.G
                : ageGroup === "teen"
                  ? ads.MaxAdContentRating.PG
                  : ads.MaxAdContentRating.T,
          });
          await ads.default().initialize();
          if (active) setAdsAvailable(true);
          if (
            process.env.EXPO_PUBLIC_APP_ENV === "production" &&
            !process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
          ) {
            // app.config.js falls back to Google's sample AdMob App ID when
            // this is unset; that's fine for dev/preview but should never
            // ship, so make it loud instead of silently serving no/test ads.
            // Best-effort only — never let a telemetry call break ad init.
            try {
              Sentry.captureMessage(
                "Production build is using Google's sample AdMob Android App ID. Set EXPO_PUBLIC_ADMOB_ANDROID_APP_ID.",
                "warning",
              );
            } catch {
              /* reporting failure must not affect ad availability */
            }
          }
        } catch (caught) {
          if (active)
            setError(caught instanceof Error ? caught.message : "Unable to initialize ads.");
        }
      }
      if (Platform.OS === "android" && revenueCatKey && Constants.appOwnership !== "expo") {
        try {
          const { default: Purchases, LOG_LEVEL } = await import("react-native-purchases");
          Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
          if (!purchasesConfigured) {
            Purchases.configure({
              apiKey: revenueCatKey,
              appUserID: session?.user.id ?? undefined,
              entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
            });
            purchasesConfigured = true;
            purchasesUserId = session?.user.id ?? null;
          } else if (session?.user.id && purchasesUserId !== session.user.id) {
            await Purchases.logIn(session.user.id);
            purchasesUserId = session.user.id;
          } else if (!session?.user.id && purchasesUserId) {
            await Purchases.logOut();
            purchasesUserId = null;
          }
          const [customer, offerings] = await Promise.all([
            Purchases.getCustomerInfo(),
            Purchases.getOfferings(),
          ]);
          const verified =
            customer.entitlements.verification !== Purchases.VERIFICATION_RESULT.FAILED;
          if (active) {
            setPremium(verified && Boolean(customer.entitlements.active[PREMIUM_ENTITLEMENT]));
            setOwnedProductIds(verified ? customer.allPurchasedProductIdentifiers : []);
            setOffering(offerings.current);
            if (!verified) setError("Purchase verification failed.");
          }
        } catch (caught) {
          if (active)
            setError(caught instanceof Error ? caught.message : "Unable to initialize purchases.");
        }
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [ageGroup, revenueCatKey, session?.user.id]);

  const showRewardedAd = useCallback(
    async (configuredUnitId?: string) => {
      if (premium) return true;
      if (!adsAvailable || Platform.OS !== "android") return false;
      const ads = await import("react-native-google-mobile-ads");
      // Closed/internal Play tests are release builds too, so __DEV__ is false.
      // Keep the official demo unit as a safe fallback until the production
      // rewarded unit is configured; this also prevents testers from clicking
      // real ads and creating invalid traffic.
      if (!configuredUnitId && !__DEV__ && process.env.EXPO_PUBLIC_APP_ENV === "production") {
        // Best-effort only — a reporting failure here must never prevent the
        // ad itself from loading.
        try {
          Sentry.captureMessage(
            "Production rewarded ad request fell back to Google's demo ad unit — no EXPO_PUBLIC_ADMOB_REWARDED_*_ID configured.",
            "warning",
          );
        } catch {
          /* ignore */
        }
      }
      const unitId = __DEV__ ? ads.TestIds.REWARDED : configuredUnitId || ads.TestIds.REWARDED;
      return new Promise<boolean>((resolve) => {
        const rewarded = ads.RewardedAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly: true,
        });
        let earned = false;
        let settled = false;
        let subscriptions: (() => void)[] = [];
        let timeout: ReturnType<typeof setTimeout>;
        const finish = (value: boolean) => {
          if (settled) return;
          settled = true;
          subscriptions.forEach((item) => {
            item();
          });
          clearTimeout(timeout);
          resolve(value);
        };
        subscriptions = [
          rewarded.addAdEventListener(ads.RewardedAdEventType.LOADED, () => void rewarded.show()),
          rewarded.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
          }),
          rewarded.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned)),
          rewarded.addAdEventListener(ads.AdEventType.ERROR, () => finish(false)),
        ];
        timeout = setTimeout(() => finish(false), 45_000);
        rewarded.load();
      });
    },
    [adsAvailable, premium],
  );

  const showRewardedHint = useCallback(
    () => showRewardedAd(process.env.EXPO_PUBLIC_ADMOB_REWARDED_HINT_ID),
    [showRewardedAd],
  );

  const showRewardedHighlight = useCallback(
    () =>
      showRewardedAd(
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_HIGHLIGHT_ID ??
          process.env.EXPO_PUBLIC_ADMOB_REWARDED_HINT_ID,
      ),
    [showRewardedAd],
  );

  const isRewardedThemeUnlocked = useCallback(
    (nextTheme: MobileTheme) => premium || (rewardedThemeUnlocks[nextTheme] ?? 0) > Date.now(),
    [premium, rewardedThemeUnlocks],
  );

  const unlockRewardedTheme = useCallback(
    async (nextTheme: MobileTheme) => {
      if (premium) return true;
      if (!REWARDED_THEMES.includes(nextTheme)) return false;
      const earned = await showRewardedAd(
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_THEME_ID ??
          process.env.EXPO_PUBLIC_ADMOB_REWARDED_HINT_ID,
      );
      if (!earned) return false;
      const nextUnlocks = {
        ...rewardedThemeUnlocks,
        [nextTheme]: Date.now() + REWARDED_THEME_DURATION,
      };
      setRewardedThemeUnlocks(nextUnlocks);
      await AsyncStorage.setItem(REWARDED_THEME_STORAGE_KEY, JSON.stringify(nextUnlocks));
      return true;
    },
    [premium, rewardedThemeUnlocks, showRewardedAd],
  );

  const purchasePremium = useCallback(
    async (packageIdentifier?: string) => {
      const selected = packageIdentifier
        ? offering?.availablePackages.find((item) => item.identifier === packageIdentifier)
        : (offering?.annual ?? offering?.monthly ?? offering?.availablePackages[0]);
      if (!selected || !revenueCatKey) return false;
      try {
        const { default: Purchases } = await import("react-native-purchases");
        const result = await Purchases.purchasePackage(selected);
        const verified =
          result.customerInfo.entitlements.verification !== Purchases.VERIFICATION_RESULT.FAILED;
        const active =
          verified && Boolean(result.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]);
        setPremium(active);
        return active;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to complete purchase.");
        return false;
      }
    },
    [offering, revenueCatKey],
  );

  const loadPackProducts = useCallback(
    async (productIds: string[]) => {
      const uniqueIds = [...new Set(productIds.filter(Boolean))];
      if (
        !uniqueIds.length ||
        !revenueCatKey ||
        Platform.OS !== "android" ||
        Constants.appOwnership === "expo"
      )
        return;
      try {
        const { default: Purchases, PRODUCT_CATEGORY } = await import("react-native-purchases");
        const products = await Purchases.getProducts(uniqueIds, PRODUCT_CATEGORY.NON_SUBSCRIPTION);
        setPackProducts((current) => ({
          ...current,
          ...Object.fromEntries(products.map((product) => [product.identifier, product])),
        }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load pack products.");
      }
    },
    [revenueCatKey],
  );

  const purchasePack = useCallback(
    async (productId: string) => {
      if (!revenueCatKey || Platform.OS !== "android" || Constants.appOwnership === "expo")
        return false;
      try {
        const { default: Purchases, PRODUCT_CATEGORY } = await import("react-native-purchases");
        const product =
          packProducts[productId] ??
          (await Purchases.getProducts([productId], PRODUCT_CATEGORY.NON_SUBSCRIPTION))[0];
        if (!product) return false;
        const result = await Purchases.purchaseStoreProduct(product);
        const verified =
          result.customerInfo.entitlements.verification !== Purchases.VERIFICATION_RESULT.FAILED;
        const purchased =
          verified && result.customerInfo.allPurchasedProductIdentifiers.includes(productId);
        setOwnedProductIds(verified ? result.customerInfo.allPurchasedProductIdentifiers : []);
        return purchased;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to complete pack purchase.");
        return false;
      }
    },
    [packProducts, revenueCatKey],
  );

  const restorePurchases = useCallback(async () => {
    if (!revenueCatKey) return false;
    try {
      const { default: Purchases } = await import("react-native-purchases");
      const customer = await Purchases.restorePurchases();
      const verified = customer.entitlements.verification !== Purchases.VERIFICATION_RESULT.FAILED;
      const active = verified && Boolean(customer.entitlements.active[PREMIUM_ENTITLEMENT]);
      setPremium(active);
      setOwnedProductIds(verified ? customer.allPurchasedProductIdentifiers : []);
      return verified && (active || customer.allPurchasedProductIdentifiers.length > 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to restore purchases.");
      return false;
    }
  }, [revenueCatKey]);

  const value = useMemo<MonetizationState>(
    () => ({
      ready,
      premium,
      adsAvailable,
      purchaseAvailable: Boolean(offering?.availablePackages.length),
      offering,
      error,
      packProducts,
      ownedProductIds,
      showRewardedHint,
      showRewardedHighlight,
      unlockRewardedTheme,
      isRewardedThemeUnlocked,
      purchasePremium,
      loadPackProducts,
      purchasePack,
      restorePurchases,
    }),
    [
      adsAvailable,
      error,
      offering,
      premium,
      purchasePremium,
      ready,
      restorePurchases,
      showRewardedHint,
      showRewardedHighlight,
      unlockRewardedTheme,
      isRewardedThemeUnlocked,
      packProducts,
      ownedProductIds,
      loadPackProducts,
      purchasePack,
    ],
  );
  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

export function useMonetization() {
  const context = useContext(MonetizationContext);
  if (!context) throw new Error("useMonetization must be used inside MonetizationProvider");
  return context;
}
