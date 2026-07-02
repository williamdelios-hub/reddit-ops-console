import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import { parseRedditTarget } from "./lib/reddit";
import { addHistory, loadDraft, loadHistory, saveDraft, type SendRecord } from "./lib/storage";

type Connection = {
  connected: boolean;
  status: string;
  accountId: string | null;
};

type Notice = { kind: "success" | "error"; message: string } | null;

const EMPTY_CONNECTION: Connection = {
  connected: false,
  status: "CHECKING",
  accountId: null,
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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
        <div className="brand-mark" aria-hidden="true">
          D
        </div>
        <p className="eyebrow">Private operations</p>
        <h1 id="login-title">Dispatch</h1>
        <p className="login-copy">Enter the private access key to open the Reddit reply console.</p>
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
            {busy ? "Opening console" : "Open console"}
          </button>
        </form>
      </section>
    </main>
  );
}

function EmptyHistory() {
  return (
    <div className="history-empty">
      <span>No sends recorded in this browser.</span>
      <span>Only confirmed attempts appear here.</span>
    </div>
  );
}

export default function App() {
  const initialDraft = useMemo(() => loadDraft(), []);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [targetUrl, setTargetUrl] = useState(initialDraft.targetUrl || "");
  const [reply, setReply] = useState(initialDraft.text || "");
  const [history, setHistory] = useState<SendRecord[]>(() => loadHistory());
  const [connection, setConnection] = useState<Connection>(EMPTY_CONNECTION);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const target = useMemo(() => parseRedditTarget(targetUrl), [targetUrl]);
  const canSend = Boolean(connection.connected && target && reply.trim() && !sending);

  useEffect(() => {
    api<{ authenticated: boolean }>("session")
      .then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    saveDraft(targetUrl, reply);
  }, [targetUrl, reply]);

  useEffect(() => {
    if (!authenticated) return;
    refreshConnection();
    if (new URLSearchParams(window.location.search).get("reddit") === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
      setNotice({ kind: "success", message: "Reddit authorization returned. Verifying connection." });
    }
  }, [authenticated]);

  useEffect(() => {
    setConfirming(false);
  }, [targetUrl, reply]);

  async function refreshConnection() {
    setConnectionBusy(true);
    try {
      const result = await api<Connection>("status");
      setConnection(result);
    } catch (error) {
      setConnection({ connected: false, status: "CHECK_FAILED", accountId: null });
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not check Reddit connection",
      });
    } finally {
      setConnectionBusy(false);
    }
  }

  async function connectReddit() {
    setConnectionBusy(true);
    setNotice(null);
    try {
      const result = await api<{ redirectUrl: string }>("connect-reddit", { method: "POST" });
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not start Reddit connection",
      });
      setConnectionBusy(false);
    }
  }

  async function logout() {
    try {
      await api("logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setConfirming(false);
    }
  }

  async function sendReply() {
    if (!target || !reply.trim() || !connection.connected) return;
    setSending(true);
    setNotice(null);
    try {
      await api("send-reply", {
        method: "POST",
        body: { thingId: target.thingId, text: reply },
      });
      const record: SendRecord = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        targetUrl: target.permalink || target.sourceUrl,
        thingId: target.thingId,
        text: reply.trim(),
        successful: true,
      };
      setHistory(addHistory(record));
      setReply("");
      setConfirming(false);
      setNotice({ kind: "success", message: "Reply sent. Reddit accepted the post request." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Reply could not be sent",
      });
    } finally {
      setSending(false);
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
        <div className="wordmark">Dispatch</div>
        <div className="topbar-actions">
          <span className={`connection-dot ${connection.connected ? "is-online" : ""}`} aria-hidden="true" />
          <span className="topbar-status">
            {connectionBusy ? "Checking" : connection.connected ? "Reddit connected" : "Reddit offline"}
          </span>
          <button className="text-button" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="composer" aria-labelledby="composer-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Manual reply console</p>
              <h1 id="composer-title">Compose</h1>
            </div>
            <p className="section-note">Nothing posts until you confirm it.</p>
          </div>

          {notice ? (
            <div className={`notice notice-${notice.kind}`} role="status">
              <span>{notice.message}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
                Close
              </button>
            </div>
          ) : null}

          <div className="field-block">
            <div className="field-label-row">
              <label htmlFor="target-url">Target Reddit URL or thing ID</label>
              <span>{target ? `${target.kind} · ${target.thingId}` : targetUrl ? "Not recognized" : "Required"}</span>
            </div>
            <input
              id="target-url"
              className={targetUrl && !target ? "is-invalid" : ""}
              type="text"
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder="https://www.reddit.com/r/.../comments/..."
              spellCheck={false}
            />
          </div>

          <div className="field-block reply-field">
            <div className="field-label-row">
              <label htmlFor="reply">Reply</label>
              <span>{reply.length.toLocaleString()} / 10,000</span>
            </div>
            <textarea
              id="reply"
              value={reply}
              onChange={(event) => setReply(event.target.value.slice(0, 10_000))}
              placeholder="Write the reply exactly as it should appear on Reddit."
            />
          </div>

          <div className="preview-block">
            <div className="field-label-row">
              <span>Preview</span>
              <span>Plain Reddit comment</span>
            </div>
            <div className={`preview-copy ${reply.trim() ? "" : "is-empty"}`}>
              {reply.trim() || "Your reply preview will appear here."}
            </div>
          </div>

          <div className="send-dock">
            <div className="target-summary">
              <span className="summary-label">Destination</span>
              <strong>{target ? target.thingId : "No valid target"}</strong>
            </div>
            <div className="send-actions">
              {target?.permalink ? (
                <a href={target.permalink} target="_blank" rel="noreferrer" className="secondary-button">
                  Open thread
                </a>
              ) : null}
              {!confirming ? (
                <button
                  className="primary-button"
                  type="button"
                  disabled={!canSend}
                  onClick={() => setConfirming(true)}
                >
                  Send reply
                </button>
              ) : (
                <div className="confirm-actions" role="group" aria-label="Confirm reply send">
                  <button className="cancel-button" type="button" onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                  <button className="primary-button confirm-button" type="button" onClick={sendReply} disabled={sending}>
                    {sending ? "Sending" : "Confirm send"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="control-rail" aria-label="Target and connection details">
          <section className="rail-section">
            <p className="eyebrow">Target details</p>
            <dl className="detail-list">
              <div>
                <dt>Type</dt>
                <dd>{target ? statusLabel(target.kind) : "Not set"}</dd>
              </div>
              <div>
                <dt>Subreddit</dt>
                <dd>{target?.subreddit ? `r/${target.subreddit}` : "Not available"}</dd>
              </div>
              <div>
                <dt>Thing ID</dt>
                <dd>{target?.thingId || "Not parsed"}</dd>
              </div>
            </dl>
          </section>

          <section className="rail-section connection-section">
            <p className="eyebrow">Connection state</p>
            <div className="connection-state">
              <span className={`connection-dot large ${connection.connected ? "is-online" : ""}`} aria-hidden="true" />
              <div>
                <strong>{connection.connected ? "Ready to post" : statusLabel(connection.status)}</strong>
                <span>{connection.connected ? "Managed Reddit OAuth is active." : "Reconnect Reddit before sending."}</span>
              </div>
            </div>
            <div className="rail-actions">
              <button className="secondary-button full-width" type="button" onClick={connectReddit} disabled={connectionBusy}>
                {connectionBusy ? "Working" : connection.connected ? "Reconnect Reddit" : "Connect Reddit"}
              </button>
              <button className="text-button refresh-button" type="button" onClick={refreshConnection} disabled={connectionBusy}>
                Refresh status
              </button>
            </div>
          </section>

          <section className="rail-section security-note">
            <p className="eyebrow">Control boundary</p>
            <p>Drafts stay in this browser. Dispatch never schedules, queues, or retries a post on its own.</p>
          </section>
        </aside>
      </main>

      <section className="history-section" aria-labelledby="history-title">
        <div className="history-heading">
          <div>
            <p className="eyebrow">Local record</p>
            <h2 id="history-title">Recent sends</h2>
          </div>
          <span>Stored only in this browser</span>
        </div>
        {history.length ? (
          <div className="history-table" role="table" aria-label="Recent successful replies">
            <div className="history-row history-header" role="row">
              <span role="columnheader">Sent</span>
              <span role="columnheader">Target</span>
              <span role="columnheader">Reply</span>
              <span role="columnheader">Result</span>
            </div>
            {history.map((record) => (
              <div className="history-row" role="row" key={record.id}>
                <span role="cell">{formatDate(record.createdAt)}</span>
                <a role="cell" href={record.targetUrl} target="_blank" rel="noreferrer">
                  {record.thingId}
                </a>
                <span role="cell" className="history-reply">{record.text}</span>
                <span role="cell" className="result-success">Sent</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHistory />
        )}
      </section>
    </div>
  );
}
