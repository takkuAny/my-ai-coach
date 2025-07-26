// lib/utils/reviewSchedule.ts

export function isDueForReview(dateStr: string, attempt: number): boolean {
  const scheduleDays = { 1: 1, 2: 3, 3: 7, 4: 14 }[attempt];
  if (!scheduleDays) return false;

  const reviewDate = new Date(dateStr);
  reviewDate.setDate(reviewDate.getDate() + scheduleDays);

  const reviewDateStr = reviewDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  return reviewDateStr === todayStr;
}


export function getReviewLabel(attempt: number): string {
  return {
    1: '復習1回目（翌日）',
    2: '復習2回目（3日後）',
    3: '復習3回目（7日後）',
    4: '復習4回目（14日後）',
  }[attempt] ?? '';
}
