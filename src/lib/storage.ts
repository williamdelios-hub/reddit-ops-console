export type SendRecord = {
  id: string;
  createdAt: string;
  targetUrl: string;
  thingId: string;
  text: string;
  successful: boolean;
};

const DRAFT_KEY = "dispatch:draft:v1";
const HISTORY_KEY = "dispatch:history:v1";

export function loadDraft(): { targetUrl: string; text: string } {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as {
      targetUrl: string;
      text: string;
    };
  } catch {
    return { targetUrl: "", text: "" };
  }
}

export function saveDraft(targetUrl: string, text: string) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ targetUrl, text }));
}

export function loadHistory(): SendRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function addHistory(record: SendRecord): SendRecord[] {
  const next = [record, ...loadHistory()].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
