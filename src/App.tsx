import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import {
  addHistory,
  loadHistory,
  loadQueueState,
  markQueueItem,
  saveQueueEdit,
  type SendRecord,
} from "./lib/storage";

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
};

type QueueResponse = {
  connected: boolean;
  owner: string;
  accountId: string;
  scannedPosts: number;
  drafts: QueueItem[];
  generatedAt: string;
};

type Notice = { kind: "success" | "error"; message: string } | null;

function formatAge(createdUtc: number | null) {
  if (!createdUtc) return "recent";
  const minutes = Math.max(1, Math.floor((Date.now() - createdUtc * 1000) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
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
      <strong>Building your review queue</strong>
      <span>Reading recent threads, removing answered comments, and drafting replies.</span>
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
  const [drafts, setDrafts] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [history, setHistory] = useState<SendRecord[]>(() => loadHistory());

  const selected = useMemo(
    () => drafts.find((item) => item.thingId === selectedId) || drafts[0] || null,
    [drafts, selectedId],
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

  async function loadQueue() {
    setLoading(true);
    setNotice(null);
    try {
      const response = await api<QueueResponse>("queue");
      const local = loadQueueState();
      const ready = response.drafts
        .filter((item) => !local.handled[item.thingId])
        .map((item) => ({ ...item, draft: local.edits[item.thingId] ?? item.draft }));
      setConnected(response.connected);
      setOwner(response.owner);
      setScannedPosts(response.scannedPosts);
      setDrafts(ready);
      setSelectedId((current) =>
        ready.some((item) => item.thingId === current) ? current : ready[0]?.thingId || null,
      );
    } catch (error) {
      setConnected(false);
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not build the approval queue",
      });
    } finally {
      setLoading(false);
    }
  }

  function editSelected(text: string) {
    if (!selected) return;
    setDrafts((current) =>
      current.map((item) => (item.thingId === selected.thingId ? { ...item, draft: text } : item)),
    );
    saveQueueEdit(selected.thingId, text);
  }

  function removeFromQueue(thingId: string, status: "sent" | "skipped") {
    markQueueItem(thingId, status);
    setDrafts((current) => {
      const index = current.findIndex((item) => item.thingId === thingId);
      const next = current.filter((item) => item.thingId !== thingId);
      setSelectedId(next[Math.min(Math.max(index, 0), Math.max(next.length - 1, 0))]?.thingId || null);
      return next;
    });
  }

  function skipSelected() {
    if (!selected) return;
    removeFromQueue(selected.thingId, "skipped");
    setNotice({ kind: "success", message: "Skipped. It will not return to this browser queue." });
  }

  async function sendSelected() {
    if (!selected || !selected.draft.trim()) return;
    setSendingId(selected.thingId);
    setNotice(null);
    try {
      await api("send-reply", {
        method: "POST",
        body: { thingId: selected.thingId, text: selected.draft },
      });
      const record: SendRecord = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        targetUrl: selected.permalink,
        thingId: selected.thingId,
        author: selected.author,
        subreddit: selected.subreddit,
        text: selected.draft.trim(),
        successful: true,
      };
      setHistory(addHistory(record));
      removeFromQueue(selected.thingId, "sent");
      setNotice({ kind: "success", message: `Reply sent to u/${selected.author}.` });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Reddit did not accept the reply",
      });
    } finally {
      setSendingId(null);
    }
  }

  async function logout() {
    try {
      await api("logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setDrafts([]);
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
          <strong className="ready-count">{drafts.length} ready</strong>
        </div>
        <div className="topbar-actions">
          <span className={`connection-dot ${connected ? "is-online" : ""}`} aria-hidden="true" />
          <span className="topbar-status">
            {connected && owner ? `Connected as u/${owner}` : loading ? "Checking Reddit" : "Reddit unavailable"}
          </span>
          <button className="text-button" type="button" onClick={() => void loadQueue()} disabled={loading}>
            {loading ? "Refreshing" : "Refresh"}
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
            <strong>{drafts.length}</strong>
          </div>
          <div className="queue-items">
            {drafts.map((item) => (
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
            {!loading && drafts.length === 0 ? (
              <div className="queue-empty-small">
                <strong>Queue clear</strong>
                <span>{scannedPosts ? `${scannedPosts} recent threads checked.` : "No drafts are waiting."}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="review-pane" aria-label="Selected reply review">
          {loading && !selected ? <LoadingQueue /> : null}
          {!loading && !selected ? (
            <div className="review-empty">
              <p className="eyebrow">Nothing waiting</p>
              <h1>Your queue is clear.</h1>
              <p>Dispatch checked your recent Reddit threads and found no unanswered comments worth drafting.</p>
              <button className="secondary-button" type="button" onClick={() => void loadQueue()}>Check again</button>
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
                  <span className="generated-label">Auto-generated draft</span>
                </div>
                <textarea
                  aria-label="Proposed reply"
                  value={selected.draft}
                  onChange={(event) => editSelected(event.target.value.slice(0, 10_000))}
                  maxLength={10_000}
                />
                <div className="character-count">{selected.draft.length.toLocaleString()} / 10,000</div>
              </section>

              <div className="review-actions">
                <button className="secondary-button" type="button" onClick={skipSelected} disabled={Boolean(sendingId)}>
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
          <strong>{history.length}</strong>
        </div>
        <div className="sent-items">
          {history.slice(0, 5).map((record) => (
            <a href={record.targetUrl} target="_blank" rel="noreferrer" key={record.id} className="sent-item">
              <span>Sent to u/{record.author}</span>
              <small>r/{record.subreddit}</small>
              <p>{record.text}</p>
            </a>
          ))}
          {history.length === 0 ? <p className="sent-empty">Approved replies will appear here.</p> : null}
        </div>
      </section>
    </div>
  );
}
