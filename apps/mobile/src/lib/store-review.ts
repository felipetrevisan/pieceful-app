import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import {
  shouldRequestStoreReview,
  type StoreReviewHistory,
} from "@/lib/store-review-policy";

const STORE_REVIEW_STORAGE_KEY = "pieceful-store-review-v1";

let requestInFlight = false;
const requestedPuzzleIdsThisSession = new Set<string>();

function parseHistory(value: string | null): StoreReviewHistory | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoreReviewHistory>;
    if (
      typeof parsed.completedPuzzlesAtLastRequest !== "number" ||
      typeof parsed.lastRequestedAt !== "string" ||
      typeof parsed.lastRequestedPuzzleId !== "string"
    ) {
      return null;
    }
    return parsed as StoreReviewHistory;
  } catch {
    return null;
  }
}

export async function requestStoreReviewIfEligible({
  completedPuzzles,
  puzzleId,
}: {
  completedPuzzles: number;
  puzzleId: string;
}) {
  if (__DEV__ || requestInFlight || requestedPuzzleIdsThisSession.has(puzzleId)) return false;

  const now = new Date();
  const history = parseHistory(await AsyncStorage.getItem(STORE_REVIEW_STORAGE_KEY));
  if (!shouldRequestStoreReview({ completedPuzzles, history, now, puzzleId })) return false;
  if (!(await StoreReview.isAvailableAsync())) return false;

  requestInFlight = true;
  requestedPuzzleIdsThisSession.add(puzzleId);

  try {
    await StoreReview.requestReview();
    await AsyncStorage.setItem(
      STORE_REVIEW_STORAGE_KEY,
      JSON.stringify({
        completedPuzzlesAtLastRequest: completedPuzzles,
        lastRequestedAt: now.toISOString(),
        lastRequestedPuzzleId: puzzleId,
      } satisfies StoreReviewHistory),
    );
    return true;
  } catch {
    requestedPuzzleIdsThisSession.delete(puzzleId);
    return false;
  } finally {
    requestInFlight = false;
  }
}
