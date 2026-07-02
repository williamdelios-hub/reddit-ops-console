export type SendRecord = {
  id: string;
  createdAt: string;
  targetUrl: string;
  thingId: string;
  author: string;
  subreddit: string;
  text: string;
  successful: boolean;
};

export type QueueState = {
  edits: Record<string, string>;
  handled: Record<string, "sent" | "skipped">;
};

const HISTORY_KEY = "dispatch:history:v2";
const QUEUE_KEY = "dispatch:queue:v2";

const EMPTY_QUEUE_STATE: QueueState = { edits: {}, handled: {} };

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

export function loadQueueState(): QueueState {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}") as Partial<QueueState>;
    return {
      edits: value.edits && typeof value.edits === "object" ? value.edits : {},
      handled: value.handled && typeof value.handled === "object" ? value.handled : {},
    };
  } catch {
    return EMPTY_QUEUE_STATE;
  }
}

function writeQueueState(state: QueueState) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(state));
  return state;
}

export function saveQueueEdit(thingId: string, text: string) {
  const state = loadQueueState();
  return writeQueueState({ ...state, edits: { ...state.edits, [thingId]: text } });
}

export function markQueueItem(thingId: string, status: "sent" | "skipped") {
  const state = loadQueueState();
  const edits = { ...state.edits };
  delete edits[thingId];
  return writeQueueState({
    edits,
    handled: { ...state.handled, [thingId]: status },
  });
}
