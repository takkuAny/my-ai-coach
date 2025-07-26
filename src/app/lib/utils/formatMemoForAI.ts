// src/lib/utils/formatMemoForAI.ts

type MemoInput = {
  date: string;
  startTime: string;
  endTime: string;
  memo: string;
  pages?: number;
  items?: number;
  attempt: number;
};

export function formatMemoForAI(input: MemoInput): string {
  const {
    date,
    startTime,
    endTime,
    memo,
    pages,
    items,
    attempt,
  } = input;

  const parts: string[] = [];

  parts.push(`📅 日付: ${date}`);
  parts.push(`🕒 時間: ${startTime} ～ ${endTime}`);
  if (pages !== undefined && pages !== 0) parts.push(`📖 読んだページ数: ${pages}ページ`);
  if (items !== undefined && items !== 0) parts.push(`🧠 覚えた単語・項目数: ${items}個`);
  parts.push(`🔁 取り組み回数: ${attempt}回目`);
  parts.push(`📝 メモ: ${memo || 'なし'}`);

  return parts.join('\n');
}
