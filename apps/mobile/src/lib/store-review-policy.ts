export const STORE_REVIEW_FIRST_COMPLETION_COUNT = 3;
export const STORE_REVIEW_COMPLETION_INTERVAL = 5;
export const STORE_REVIEW_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1_000;

export interface StoreReviewHistory {
  completedPuzzlesAtLastRequest: number;
  lastRequestedAt: string;
  lastRequestedPuzzleId: string;
}

interface StoreReviewEligibilityInput {
  completedPuzzles: number;
  history: StoreReviewHistory | null;
  now: Date;
  puzzleId: string;
}

export function shouldRequestStoreReview({
  completedPuzzles,
  history,
  now,
  puzzleId,
}: StoreReviewEligibilityInput) {
  if (completedPuzzles < STORE_REVIEW_FIRST_COMPLETION_COUNT) return false;
  if (!history) return true;
  if (history.lastRequestedPuzzleId === puzzleId) return false;

  const completionsSinceLastRequest =
    completedPuzzles - history.completedPuzzlesAtLastRequest;
  if (completionsSinceLastRequest < STORE_REVIEW_COMPLETION_INTERVAL) return false;

  const lastRequestedAt = new Date(history.lastRequestedAt).getTime();
  if (!Number.isFinite(lastRequestedAt)) return true;

  const elapsed = now.getTime() - lastRequestedAt;
  return elapsed >= STORE_REVIEW_COOLDOWN_MS;
}
