import type { QueueItem, QueueView } from "../../domain/dispatch";
import { formatAge } from "./format";

type Props = {
  awaitingCount: number;
  loading: boolean;
  saving: boolean;
  selected: QueueItem | null;
  sending: boolean;
  view: QueueView;
  onEdit: (draft: string) => void;
  onFlush: (thingId: string, draft: string) => void;
  onSend: () => void;
  onSkip: () => void;
  onViewChange: (view: QueueView) => void;
};

function LoadingQueue() {
  return (
    <div className="queue-loading" role="status">
      <div className="loading-rule" aria-hidden="true" />
      <strong>Loading saved drafts</strong>
      <span>Opening the latest scheduled batch from your private queue.</span>
    </div>
  );
}

export function ReviewPane({
  awaitingCount,
  loading,
  saving,
  selected,
  sending,
  view,
  onEdit,
  onFlush,
  onSend,
  onSkip,
  onViewChange,
}: Props) {
  return (
    <section className="review-pane" aria-label="Selected reply review">
      {loading && !selected ? <LoadingQueue /> : null}
      {!loading && !selected ? (
        <div className="review-empty">
          <p className="eyebrow">Nothing waiting</p>
          <h1>{view === "latest" && awaitingCount ? "Latest batch is clear." : "Your queue is clear."}</h1>
          <p>
            {view === "latest" && awaitingCount
              ? "Older proposed replies are still waiting in All awaiting."
              : "The next scheduled check will add new proposed replies here for your review."}
          </p>
          {view === "latest" && awaitingCount ? (
            <button className="secondary-button" type="button" onClick={() => onViewChange("all")}>
              See all awaiting
            </button>
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
              <span className="draft-origin">Scheduled draft</span>
            </div>
            <textarea
              aria-label="Proposed reply"
              value={selected.draft}
              onChange={(event) => onEdit(event.target.value.slice(0, 10_000))}
              onBlur={(event) => onFlush(selected.thingId, event.currentTarget.value)}
              maxLength={10_000}
            />
            <div className="character-count">
              {saving ? "Saving" : `${selected.draft.length.toLocaleString()} / 10,000`}
            </div>
          </section>

          <div className="review-actions">
            <button className="secondary-button" type="button" onClick={onSkip} disabled={sending}>
              Skip
            </button>
            <a className="secondary-button" href={selected.permalink} target="_blank" rel="noreferrer">
              Open on Reddit
            </a>
            <button
              className="primary-button send-button"
              type="button"
              onClick={onSend}
              disabled={!selected.draft.trim() || sending}
            >
              {sending ? "Sending" : "Send reply"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
