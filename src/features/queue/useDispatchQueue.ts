import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import type {
  Notice,
  OperatorProfile,
  QueueItem,
  QueueResponse,
  QueueView,
} from "../../domain/dispatch";

export function useDispatchQueue() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [owner, setOwner] = useState("");
  const [scannedPosts, setScannedPosts] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [latestBatchId, setLatestBatchId] = useState<string | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [awaiting, setAwaiting] = useState<QueueItem[]>([]);
  const [sent, setSent] = useState<QueueItem[]>([]);
  const [view, setView] = useState<QueueView>("latest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const saveTimer = useRef<number | null>(null);

  const latest = useMemo(
    () => awaiting.filter((item) => item.batchId === latestBatchId),
    [awaiting, latestBatchId],
  );
  const visible = view === "latest" ? latest : awaiting;
  const selected = visible.find((item) => item.thingId === selectedId) || visible[0] || null;

  useEffect(() => {
    void loadQueue();
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    setSelectedId((current) => visible.some((item) => item.thingId === current)
      ? current
      : visible[0]?.thingId || null);
  }, [visible]);

  async function loadQueue() {
    setLoading(true);
    setNotice(null);
    try {
      const response = await api<QueueResponse>("queue");
      setConnected(response.connected);
      setOwner(response.owner);
      setScannedPosts(response.scannedPosts);
      setLastSyncAt(response.lastSyncAt);
      setLatestBatchId(response.latestBatchId);
      setOperatorProfile(response.operatorProfile);
      setAwaiting(response.awaiting);
      setSent(response.sent);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load the approval queue",
      });
    } finally {
      setLoading(false);
    }
  }

  async function persistDraft(thingId: string, draft: string) {
    if (!draft.trim()) return;
    setSavingId(thingId);
    try {
      await api("queue-item", {
        method: "POST",
        body: { action: "edit", thingId, draft },
      });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Draft edit was not saved" });
    } finally {
      setSavingId(null);
    }
  }

  function editDraft(draft: string) {
    if (!selected) return;
    const thingId = selected.thingId;
    setAwaiting((current) => current.map((item) => (
      item.thingId === thingId ? { ...item, draft } : item
    )));
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void persistDraft(thingId, draft);
    }, 600);
  }

  function flushDraft(thingId: string, draft: string) {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    void persistDraft(thingId, draft);
  }

  function removeFromQueue(thingId: string) {
    setAwaiting((current) => current.filter((item) => item.thingId !== thingId));
  }

  async function skipSelected() {
    if (!selected) return;
    try {
      await api("queue-item", {
        method: "POST",
        body: { action: "skip", thingId: selected.thingId },
      });
      removeFromQueue(selected.thingId);
      setNotice({ kind: "success", message: "Skipped. This comment will not return in a later batch." });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Could not skip this reply" });
    }
  }

  async function sendSelected() {
    if (!selected || !selected.draft.trim()) return;
    const target = selected;
    setSendingId(target.thingId);
    setNotice(null);
    try {
      await api("send-reply", {
        method: "POST",
        body: { thingId: target.thingId, text: target.draft },
      });
      const sentItem: QueueItem = {
        ...target,
        status: "sent",
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSent((current) => [sentItem, ...current].slice(0, 20));
      removeFromQueue(target.thingId);
      setNotice({ kind: "success", message: `Reply sent to u/${target.author}.` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Reddit did not accept the reply" });
    } finally {
      setSendingId(null);
    }
  }

  return {
    awaiting,
    connected,
    dismissNotice: () => setNotice(null),
    editDraft,
    flushDraft,
    latest,
    lastSyncAt,
    loadQueue,
    loading,
    notice,
    operatorProfile,
    owner,
    savingId,
    scannedPosts,
    selected,
    selectedId,
    sendingId,
    sent,
    setSelectedId,
    setView,
    skipSelected,
    sendSelected,
    view,
    visible,
  };
}
