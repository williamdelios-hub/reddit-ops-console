import type { OperatorDocument, OperatorProfile } from "../../domain/dispatch";
import { shortHash } from "./format";

function DocumentSection({ title, document }: { title: string; document: OperatorDocument }) {
  return (
    <section className="profile-document">
      <div className="profile-document-heading">
        <div>
          <span className="section-label">{title}</span>
          <strong>{document.configured ? document.label : "Not configured"}</strong>
        </div>
        <dl>
          <div>
            <dt>Source</dt>
            <dd>{document.fileName || "None"}</dd>
          </div>
          <div>
            <dt>Fingerprint</dt>
            <dd>{shortHash(document.sha256)}</dd>
          </div>
        </dl>
      </div>
      {document.content ? <pre>{document.content}</pre> : (
        <p className="profile-missing">Run the setup prompt again and publish this document.</p>
      )}
    </section>
  );
}

export function SetupView({ profile }: { profile: OperatorProfile | null }) {
  if (!profile) {
    return (
      <main className="profile-empty">
        <p className="eyebrow">Setup incomplete</p>
        <h1>No operator profile is published.</h1>
        <p>Use the setup prompt on the login page to publish the voice, product brief, and schedule.</p>
      </main>
    );
  }

  const schedulerLabel = profile.scheduler.provider === "claude-code" ? "Claude Code" : "Codex";

  return (
    <main className="profile-view">
      <header className="profile-header">
        <div>
          <p className="eyebrow">Active drafting context</p>
          <h1>{profile.displayName}</h1>
          <p>This is the exact private context supplied to every scheduled drafting run.</p>
        </div>
        <dl className="profile-status">
          <div>
            <dt>Voice</dt>
            <dd>{profile.voice.configured ? "Mapped" : "Missing"}</dd>
          </div>
          <div>
            <dt>Brief</dt>
            <dd>{profile.productBrief.configured ? "Published" : "Missing"}</dd>
          </div>
          <div>
            <dt>Schedule</dt>
            <dd>{profile.scheduler.active ? "Active" : "Inactive"}</dd>
          </div>
        </dl>
      </header>

      <section className="connection-ledger" aria-label="Workflow connections">
        <div><span>Discovery</span><strong>Composio + Reddit</strong></div>
        <div><span>Drafting</span><strong>{schedulerLabel}</strong></div>
        <div><span>Cadence</span><strong>{profile.scheduler.cadence || "Not set"}</strong></div>
        <div><span>Storage</span><strong>Netlify Blobs</strong></div>
        <div><span>Publishing</span><strong>Manual approval only</strong></div>
      </section>

      <div className="profile-documents">
        <DocumentSection title="Voice instruction" document={profile.voice} />
        <DocumentSection title="Product brief" document={profile.productBrief} />
      </div>
    </main>
  );
}
