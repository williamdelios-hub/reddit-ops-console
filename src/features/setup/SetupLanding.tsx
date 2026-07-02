import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { setupPrompt, type SetupProvider } from "./setupPrompts";

type Props = {
  onLogin: () => void;
};

const setupSteps = [
  ["01", "Attach context", "A writing sample and product brief stay separate."],
  ["02", "Let your agent wire it", "Codex or Claude handles deployment, tokens, and scheduling."],
  ["03", "Approve the words", "Every reply waits here until you choose to send it."],
] as const;

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard access is unavailable");
  }
}

export function SetupLanding({ onLogin }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<SetupProvider | null>(null);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  async function copySetup(provider: SetupProvider) {
    try {
      const prompt = setupPrompt(provider);
      await copyText(prompt);
      setCopyFallback(null);
      setCopied(provider);
      window.setTimeout(() => setCopied((current) => current === provider ? null : current), 1800);
    } catch {
      setCopyFallback(setupPrompt(provider));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { method: "POST", body: { key: accessToken } });
      setAccessToken("");
      onLogin();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Access denied");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="setup-shell">
      <section className="setup-intro" aria-labelledby="setup-title">
        <div className="setup-brand">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>Dispatch</span>
        </div>

        <div className="setup-copy">
          <p className="eyebrow">Human-approved Reddit replies</p>
          <h1 id="setup-title">Review the words before they leave your account.</h1>
          <p>
            Self-host a private queue that learns how you write, understands what you build,
            and leaves the final decision with you.
          </p>
        </div>

        <div className="setup-actions" aria-label="Setup with a coding agent">
          <button className="primary-button" type="button" onClick={() => void copySetup("codex")}>
            {copied === "codex" ? "Codex prompt copied" : "Copy Codex setup"}
          </button>
          <button className="secondary-button" type="button" onClick={() => void copySetup("claude-code")}>
            {copied === "claude-code" ? "Claude prompt copied" : "Copy Claude Code setup"}
          </button>
        </div>
        {copyFallback ? (
          <div className="manual-copy">
            <label htmlFor="manual-setup-prompt">Clipboard blocked. Select the prompt and copy it manually.</label>
            <textarea
              id="manual-setup-prompt"
              value={copyFallback}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        ) : null}

        <ol className="setup-steps">
          {setupSteps.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="login-rail" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Private operations</p>
          <h2 id="login-title">Open your queue</h2>
          <p className="login-copy">Paste the access token created during setup.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="access-token">Access token</label>
          <input
            id="access-token"
            type="password"
            autoComplete="current-password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button login-button" type="submit" disabled={!accessToken || busy}>
            {busy ? "Opening queue" : "Open queue"}
          </button>
        </form>
        <p className="login-note">No account recovery. Keep the token somewhere you trust.</p>
      </section>
    </main>
  );
}
