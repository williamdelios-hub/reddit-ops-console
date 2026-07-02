import type { QueueItem } from "../../domain/dispatch";

export function SentHistory({ items }: { items: QueueItem[] }) {
  return (
    <section className="sent-strip" aria-labelledby="sent-title">
      <div className="sent-heading">
        <span id="sent-title">Recently sent</span>
        <strong>{items.length}</strong>
      </div>
      <div className="sent-items">
        {items.slice(0, 5).map((item) => (
          <a href={item.permalink} target="_blank" rel="noreferrer" key={item.thingId} className="sent-item">
            <span>Sent to u/{item.author}</span>
            <small>r/{item.subreddit}</small>
            <p>{item.draft}</p>
          </a>
        ))}
        {items.length === 0 ? <p className="sent-empty">Approved replies will appear here.</p> : null}
      </div>
    </section>
  );
}
