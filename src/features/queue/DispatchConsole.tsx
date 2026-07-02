import { useState } from "react";
import { api } from "../../lib/api";
import { formatSync } from "./format";
import { QueueRail } from "./QueueRail";
import { ReviewPane } from "./ReviewPane";
import { SentHistory } from "./SentHistory";
import { SetupView } from "./SetupView";
import { useDispatchQueue } from "./useDispatchQueue";

type Props = {
  onLogout: () => void;
};

type ConsoleView = "queue" | "setup";

export function DispatchConsole({ onLogout }: Props) {
  const [consoleView, setConsoleView] = useState<ConsoleView>("queue");
  const queue = useDispatchQueue();

  async function logout() {
    try {
      await api("logout", { method: "POST" });
    } finally {
      onLogout();
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-cluster">
          <div className="wordmark">Dispatch</div>
          <nav className="console-nav" aria-label="Dispatch sections">
            <button
              type="button"
              className={consoleView === "queue" ? "is-active" : ""}
              onClick={() => setConsoleView("queue")}
            >
              Approval queue
            </button>
            <button
              type="button"
              className={consoleView === "setup" ? "is-active" : ""}
              onClick={() => setConsoleView("setup")}
            >
              Setup
            </button>
          </nav>
          {consoleView === "queue" ? <strong className="ready-count">{queue.awaiting.length} ready</strong> : null}
        </div>
        <div className="topbar-actions">
          <span className={`connection-dot ${queue.connected ? "is-online" : ""}`} aria-hidden="true" />
          <span className="topbar-status">
            {queue.connected && queue.owner ? `Connected as u/${queue.owner}` : "Awaiting Reddit connection"}
          </span>
          <span className="topbar-sync">{formatSync(queue.lastSyncAt)}</span>
          {consoleView === "queue" ? (
            <button className="text-button" type="button" onClick={() => void queue.loadQueue()} disabled={queue.loading}>
              {queue.loading ? "Reloading" : "Reload"}
            </button>
          ) : null}
          <button className="text-button" type="button" onClick={() => void logout()}>Log out</button>
        </div>
      </header>

      {queue.notice ? (
        <div className={`notice notice-${queue.notice.kind}`} role="status">
          <span>{queue.notice.message}</span>
          <button type="button" onClick={queue.dismissNotice}>Close</button>
        </div>
      ) : null}

      {consoleView === "setup" ? <SetupView profile={queue.operatorProfile} /> : (
        <>
          <main className="review-workspace">
            <QueueRail
              awaitingCount={queue.awaiting.length}
              latestCount={queue.latest.length}
              loading={queue.loading}
              scannedPosts={queue.scannedPosts}
              selectedId={queue.selected?.thingId || null}
              items={queue.visible}
              view={queue.view}
              onSelect={queue.setSelectedId}
              onViewChange={queue.setView}
            />
            <ReviewPane
              awaitingCount={queue.awaiting.length}
              loading={queue.loading}
              saving={queue.savingId === queue.selected?.thingId}
              selected={queue.selected}
              sending={queue.sendingId === queue.selected?.thingId}
              view={queue.view}
              onEdit={queue.editDraft}
              onFlush={queue.flushDraft}
              onSend={() => void queue.sendSelected()}
              onSkip={() => void queue.skipSelected()}
              onViewChange={queue.setView}
            />
          </main>
          <SentHistory items={queue.sent} />
        </>
      )}
    </div>
  );
}
