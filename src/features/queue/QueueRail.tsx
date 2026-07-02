import type { QueueItem, QueueView } from "../../domain/dispatch";
import { formatAge } from "./format";

type Props = {
  awaitingCount: number;
  latestCount: number;
  loading: boolean;
  scannedPosts: number;
  selectedId: string | null;
  items: QueueItem[];
  view: QueueView;
  onSelect: (thingId: string) => void;
  onViewChange: (view: QueueView) => void;
};

export function QueueRail({
  awaitingCount,
  latestCount,
  loading,
  scannedPosts,
  selectedId,
  items,
  view,
  onSelect,
  onViewChange,
}: Props) {
  return (
    <aside className="queue-rail" aria-label="Unanswered comment queue">
      <div className="rail-heading">
        <span>Unanswered</span>
        <strong>{items.length}</strong>
      </div>
      <div className="queue-filters" aria-label="Queue view">
        <button
          type="button"
          className={view === "latest" ? "is-active" : ""}
          aria-pressed={view === "latest"}
          onClick={() => onViewChange("latest")}
        >
          Latest batch <span>{latestCount}</span>
        </button>
        <button
          type="button"
          className={view === "all" ? "is-active" : ""}
          aria-pressed={view === "all"}
          onClick={() => onViewChange("all")}
        >
          All awaiting <span>{awaitingCount}</span>
        </button>
      </div>
      <div className="queue-items">
        {items.map((item) => (
          <button
            type="button"
            className={`queue-item ${selectedId === item.thingId ? "is-selected" : ""}`}
            key={item.thingId}
            onClick={() => onSelect(item.thingId)}
            aria-pressed={selectedId === item.thingId}
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
        {!loading && items.length === 0 ? (
          <div className="queue-empty-small">
            <strong>{view === "latest" ? "No drafts in the latest batch" : "Queue clear"}</strong>
            <span>
              {view === "latest" && awaitingCount
                ? "Older drafts are still available under All awaiting."
                : `${scannedPosts || 0} recent threads checked.`}
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
