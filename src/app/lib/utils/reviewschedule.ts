// lib/utils/reviewSchedule.ts

export function isDueForReview(dateStr: string, attempt: number): boolean {
  const scheduleDays = { 1: 1, 2: 3, 3: 7, 4: 14 }[attempt];
  if (!scheduleDays) return false;

  const reviewDate = new Date(dateStr);
  reviewDate.setDate(reviewDate.getDate() + scheduleDays);

  // 日付文字列で00:00にして比較
  const review = new Date(reviewDate.toISOString().slice(0, 10));
  const today = new Date(new Date().toISOString().slice(0, 10));

  return review <= today;
}

export function getReviewLabel(attempt: number): string {
  return {
    1: 'Review 1 (Next Day)',
    2: 'Review 2 (In 3 Days)',
    3: 'Review 3 (In 7 Days)',
    4: 'Review 4 (In 14 Days)',
  }[attempt] ?? '';
}
