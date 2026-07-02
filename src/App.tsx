import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";

type QueueStatus = "awaiting" | "sending" | "sent" | "skipped";

type QueueItem = {
  thingId: string;
  commentId: string;
  author: string;
  body: string;
  permalink: string;
  createdUtc: number | null;
  score: number | null;
  depth: number | null;
  postId: string;
  postTitle: string;
  subreddit: string;
  postPermalink: string;
  draft: string;
  rationale: string;
  batchId: string;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
};

type QueueResponse = {
  connected: boolean;
  owner: string;
  accountId: string;
  scannedPosts: number;
  latestBatchId: string | null;
  lastSyncAt: string | null;
  awaiting: QueueItem[];
  sent: QueueItem[];
};

type Notice = { kind: "success" | "error"; message: string } | null;
type QueueView = "latest" | "all";

function formatAge(createdUtc: number | null) {
  if (!createdUtc) return "recent";
  const minutes = Math.max(1, Math.floor((Date.now() - createdUtc * 1000) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatSync(value: string | null) {
  if (!value) return "No scheduled check yet";
  return `Last checked ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { method: "POST", body: { key } });
      setKey("");
      onLogin();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Access denied");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">D</div>
        <p className="eyebrow">Private operations</p>
        <h1 id="login-title">Dispatch</h1>
        <p className="login-copy">Enter the private access key to open the approval queue.</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="access-key">Access key</label>
          <input
            id="access-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoFocus
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button login-button" type="submit" disabled={!key || busy}>
            {busy ? "Opening queue" : "Open queue"}
          </button>
        </form>
      </section>
    </main>
  );
}

function LoadingQueue() {
  return (
    <div className="queue-loading" role="status">
      <div className="loading-rule" aria-hidden="true" />
      <strong>Loading saved drafts</strong>
      <span>Opening the latest scheduled batch from your private queue.</span>
    </div>
  );
}

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [owner, setOwner] = useState("");
  const [scannedPosts, setScannedPosts] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [latestBatchId, setLatestBatchId] = useState<string | null>(null);
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
  const selected = useMemo(
    () => visible.find((item) => item.thingId === selectedId) || visible[0] || null,
    [visible, selectedId],
  );

  useEffect(() => {
    api<{ authenticated: boolean }>("session")
      .then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (authenticated) void loadQueue();
  }, [authenticated]);

  useEffect(() => {
    setSelectedId((current) => visible.some((item) => item.thingId === current) ? current : visible[0]?.thingId || null);
  }, [visible]);

  useEffect(() => () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
  }, []);

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

  function editSelected(draft: string) {
    if (!selected) return;
    const thingId = selected.thingId;
    setAwaiting((current) => current.map((item) => (
      item.thingId === thingId ? { ...item, draft } : item
    )));
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void saveSelected(thingId, draft);
    }, 600);
  }

  async function saveSelected(thingId: string, draft: string) {
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

  function flushSelected(thingId: string, draft: string) {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    void saveSelected(thingId, draft);
  }

  function removeFromQueue(thingId: string) {
    setAwaiting((current) => current.filter((item) => item.thingId !== thingId));
  }

  async function skipSelected() {
    if (!selected) return;
    const target = selected;
    try {
      await api("queue-item", { method: "POST", body: { action: "skip", thingId: target.thingId } });
      removeFromQueue(target.thingId);
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

  async function logout() {
    try {
      await api("logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setAwaiting([]);
      setSent([]);
    }
  }

  if (checkingSession) {
    return (
      <main className="loading-screen">
        <span>Dispatch</span>
        <small>Checking private session</small>
      </main>
    );
  }

  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-cluster">
          <div className="wordmark">Dispatch</div>
          <div className="queue-title">Approval queue</div>
          <strong className="ready-count">{awaiting.length} ready</strong>
        </div>
        <div className="topbar-actions">
          <span className={`connection-dot ${connected ? "is-online" : ""}`} aria-hidden="true" />
          <span className="topbar-status">
            {connected && owner ? `Connected as u/${owner}` : "Awaiting first scheduled check"}
          </span>
          <span className="topbar-sync">{formatSync(lastSyncAt)}</span>
          <button className="text-button" type="button" onClick={() => void loadQueue()} disabled={loading}>
            {loading ? "Reloading" : "Reload"}
          </button>
          <button className="text-button" type="button" onClick={logout}>Log out</button>
        </div>
      </header>

      {notice ? (
        <div className={`notice notice-${notice.kind}`} role="status">
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)}>Close</button>
        </div>
      ) : null}

      <main className="review-workspace">
        <aside className="queue-rail" aria-label="Unanswered comment queue">
          <div className="rail-heading">
            <span>Unanswered</span>
            <strong>{visible.length}</strong>
          </div>
          <div className="queue-filters" aria-label="Queue view">
            <button
              type="button"
              className={view === "latest" ? "is-active" : ""}
              aria-pressed={view === "latest"}
              onClick={() => setView("latest")}
            >
              Latest batch <span>{latest.length}</span>
            </button>
            <button
              type="button"
              className={view === "all" ? "is-active" : ""}
              aria-pressed={view === "all"}
              onClick={() => setView("all")}
            >
              All awaiting <span>{awaiting.length}</span>
            </button>
          </div>
          <div className="queue-items">
            {visible.map((item) => (
              <button
                type="button"
                className={`queue-item ${selected?.thingId === item.thingId ? "is-selected" : ""}`}
                key={item.thingId}
                onClick={() => setSelectedId(item.thingId)}
                aria-pressed={selected?.thingId === item.thingId}
              >
                <span className="queue-meta">
                  <strong>u/{item.author}</strong>
                  <span>r/{item.subreddit}</span>
                  <time>{formatAge(item.createdUtc)}</time>
                </span>
                <span className="queue-preview">{item.body}</span>
                <span className="queue-signal">Draft ready</span>
              </button>
            ))}
            {!loading && visible.length === 0 ? (
              <div className="queue-empty-small">
                <strong>{view === "latest" ? "No drafts in the latest batch" : "Queue clear"}</strong>
                <span>{view === "latest" && awaiting.length ? "Older drafts are still available under All awaiting." : `${scannedPosts || 0} recent threads checked.`}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="review-pane" aria-label="Selected reply review">
          {loading && !selected ? <LoadingQueue /> : null}
          {!loading && !selected ? (
            <div className="review-empty">
              <p className="eyebrow">Nothing waiting</p>
              <h1>{view === "latest" && awaiting.length ? "Latest batch is clear." : "Your queue is clear."}</h1>
              <p>
                {view === "latest" && awaiting.length
                  ? "Older proposed replies are still waiting in All awaiting."
                  : "The next scheduled Codex check will add new proposed replies here for your review."}
              </p>
              {view === "latest" && awaiting.length ? (
                <button className="secondary-button" type="button" onClick={() => setView("all")}>See all awaiting</button>
              ) : null}
            </div>
          ) : null}
          {selected ? (
            <div className="review-content">
              <section className="original-comment">
                <div className="section-label-row">
                  <span>Original comment</span>
                  <span>{formatAge(selected.createdUtc)} ago</span>
                </div>
                <div className="source-author">
                  <strong>u/{selected.author}</strong>
                  <span>r/{selected.subreddit}</span>
                  <span>{selected.score ?? 0} points</span>
                </div>
                <blockquote>{selected.body}</blockquote>
                <div className="thread-context">
                  <span>Thread</span>
                  <strong>{selected.postTitle}</strong>
                </div>
              </section>

              <section className="draft-editor">
                <div className="draft-heading">
                  <div>
                    <span className="section-label">Proposed reply</span>
                    <p>Edit anything you want, then send.</p>
                  </div>
                  <span className="generated-label">Codex scheduled draft</span>
                </div>
                <textarea
                  aria-label="Proposed reply"
                  value={selected.draft}
                  onChange={(event) => editSelected(event.target.value.slice(0, 10_000))}
                  onBlur={(event) => flushSelected(selected.thingId, event.currentTarget.value)}
                  maxLength={10_000}
                />
                <div className="character-count">
                  {savingId === selected.thingId ? "Saving" : `${selected.draft.length.toLocaleString()} / 10,000`}
                </div>
              </section>

              <div className="review-actions">
                <button className="secondary-button" type="button" onClick={() => void skipSelected()} disabled={Boolean(sendingId)}>
                  Skip
                </button>
                <a className="secondary-button" href={selected.permalink} target="_blank" rel="noreferrer">
                  Open on Reddit
                </a>
                <button
                  className="primary-button send-button"
                  type="button"
                  onClick={() => void sendSelected()}
                  disabled={!selected.draft.trim() || Boolean(sendingId)}
                >
                  {sendingId === selected.thingId ? "Sending" : "Send reply"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <section className="sent-strip" aria-labelledby="sent-title">
        <div className="sent-heading">
          <span id="sent-title">Recently sent</span>
          <strong>{sent.length}</strong>
        </div>
        <div className="sent-items">
          {sent.slice(0, 5).map((item) => (
            <a href={item.permalink} target="_blank" rel="noreferrer" key={item.thingId} className="sent-item">
              <span>Sent to u/{item.author}</span>
              <small>r/{item.subreddit}</small>
              <p>{item.draft}</p>
            </a>
          ))}
          {sent.length === 0 ? <p className="sent-empty">Approved replies will appear here.</p> : null}
        </div>
      </section>
    </div>
  );
}
