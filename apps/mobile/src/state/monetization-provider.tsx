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
import { useApp } from "@/state/app-provider";
import { useSocial } from "@/state/social-provider";

const PREMIUM_ENTITLEMENT = "premium";
let purchasesConfigured = false;

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
  purchasePremium: () => Promise<boolean>;
  loadPackProducts: (productIds: string[]) => Promise<void>;
  purchasePack: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const MonetizationContext = createContext<MonetizationState | null>(null);

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { ageGroup } = useApp();
  const { session } = useSocial();
  const [ready, setReady] = useState(false);
  const [premium, setPremium] = useState(false);
  const [adsAvailable, setAdsAvailable] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [packProducts, setPackProducts] = useState<Record<string, PurchasesStoreProduct>>({});
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

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
            });
            purchasesConfigured = true;
          } else if (session?.user.id) {
            await Purchases.logIn(session.user.id);
          }
          const [customer, offerings] = await Promise.all([
            Purchases.getCustomerInfo(),
            Purchases.getOfferings(),
          ]);
          if (active) {
            setPremium(Boolean(customer.entitlements.active[PREMIUM_ENTITLEMENT]));
            setOwnedProductIds(customer.allPurchasedProductIdentifiers);
            setOffering(offerings.current);
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

  const showRewardedHint = useCallback(async () => {
    if (premium) return true;
    if (!adsAvailable || Platform.OS !== "android") return false;
    const ads = await import("react-native-google-mobile-ads");
    const unitId = __DEV__ ? ads.TestIds.REWARDED : process.env.EXPO_PUBLIC_ADMOB_REWARDED_HINT_ID;
    if (!unitId) return false;
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
  }, [adsAvailable, premium]);

  const purchasePremium = useCallback(async () => {
    const selected = offering?.availablePackages[0];
    if (!selected || !revenueCatKey) return false;
    try {
      const { default: Purchases } = await import("react-native-purchases");
      const result = await Purchases.purchasePackage(selected);
      const active = Boolean(result.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]);
      setPremium(active);
      return active;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete purchase.");
      return false;
    }
  }, [offering, revenueCatKey]);

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
        const purchased = result.customerInfo.allPurchasedProductIdentifiers.includes(productId);
        setOwnedProductIds(result.customerInfo.allPurchasedProductIdentifiers);
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
      const active = Boolean(customer.entitlements.active[PREMIUM_ENTITLEMENT]);
      setPremium(active);
      setOwnedProductIds(customer.allPurchasedProductIdentifiers);
      return active || customer.allPurchasedProductIdentifiers.length > 0;
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
