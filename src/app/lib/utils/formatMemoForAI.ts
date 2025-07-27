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

  parts.push(`📅 Date: ${date}`);
  parts.push(`🕒 Time: ${startTime} - ${endTime}`);
  if (pages !== undefined && pages !== 0) parts.push(`📖 Pages Read: ${pages}`);
  if (items !== undefined && items !== 0) parts.push(`🧠 Items Memorized: ${items}`);
  parts.push(`🔁 Attempt: ${attempt}`);
  parts.push(`📝 Memo: ${memo || 'None'}`);

  return parts.join('\n');
}
