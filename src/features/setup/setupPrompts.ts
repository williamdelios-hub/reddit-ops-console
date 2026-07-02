const REPOSITORY_URL = "https://github.com/williamdelios-hub/reddit-ops-console";

const sharedPrompt = `HUMAN INPUT FIRST

Before you begin, ask me for two separate optional attachments:

1. A writing reference. This can be posts, comments, emails, or any substantial text written in my natural voice. Analyze it and turn it into the exact voice instruction the scheduled drafting agent will use. Do not simply paste my sample back as the prompt.
2. A product brief. This should contain current product facts, approved links, capabilities, limitations, claims, and compliance boundaries. Keep it separate from the voice profile.

If I skip either attachment, continue. Create a restrained default voice profile or a product brief that forbids unsupported product claims.

OUTCOME

Set up my own private Dispatch deployment. Use the repository currently open in this coding session. If no Dispatch repository is open, create my own copy from ${REPOSITORY_URL} first. Dispatch reads unanswered Reddit comments, drafts replies in my configured voice, and stores them for review. It must never post on a schedule. Only my click on Send reply may publish.

SETUP CONTRACT

1. Clone or fork the repository and read README.md, docs/SETUP_CONTRACT.md, and automation/AUTOMATION_RUNBOOK.md completely.
2. Install dependencies and run the existing checks before changing anything.
3. Create automation/operator/VOICE.md from my writing reference and automation/operator/PRODUCT_BRIEF.md from my product information. These files are private and ignored by Git.
4. Create or link a Netlify project. Do not reuse an unrelated site.
5. Help me connect one Reddit account through Composio Connect. Store COMPOSIO_CONNECT_API_KEY only in Netlify and the local secret store. Never commit or repeat it.
6. Run npm run setup:init with the correct provider. This generates OPS_ACCESS_KEY, SESSION_SECRET, and DISPATCH_INGEST_KEY, saves them securely, and configures Netlify. Return OPS_ACCESS_KEY to me once as my login token.
7. Deploy with Netlify, then run npm run setup:publish with my voice file, product brief, provider, cadence, and display name.
8. Create a durable schedule that runs four times per day. Each run must follow automation/AUTOMATION_RUNBOOK.md exactly.
9. Run one read-only discovery check and verify the private site shows the connected account, actual voice profile, actual product brief, active schedule, and saved draft queue.
10. Do not click Send reply and do not call any Reddit mutation tool during setup or testing.

CONNECTION MAP

- Reddit OAuth and Reddit API actions: Composio Connect
- Unanswered-comment discovery: scripts/fetch-reddit-context.mts
- Exact voice and product context: private operator profile in Netlify Blobs
- Draft generation: the scheduled coding agent, using the stored profile
- Draft ingestion: scripts/ingest-drafts.mts
- Queue, edits, and sent history: Netlify Blobs
- Publishing: authenticated same-origin Send reply request only

Work autonomously through safe setup steps. Stop only for a login, OAuth consent, or missing account choice that I must complete. At the end, give me the site URL, login token, connected Reddit username, schedule, and verification results.`;

const providerInstructions = {
  codex: `

CODEX SCHEDULING

Use a standalone project automation in the Codex app, running in the local Dispatch checkout. Schedule it at 8:00, 12:00, 16:00, and 20:00 in my local timezone. The automation prompt must tell Codex to run the repository runbook, use the stored operator profile, ingest drafts only, and never mutate Reddit. Verify the first run manually before leaving it active. Remind me that the machine and Codex app must be running for a local automation.`,
  "claude-code": `

CLAUDE CODE SCHEDULING

Use a durable Claude Code Routine or a Claude Desktop local scheduled task. Prefer a local Desktop task when the Dispatch checkout and secrets live on my machine. If you use a remote Routine, use my fork, configure its environment secrets, and confirm it can reach Netlify and Composio. Do not use a session-only /loop as the permanent scheduler because it expires and depends on the open session. Schedule four daily runs and make the routine follow the repository runbook, ingest drafts only, and never mutate Reddit.`,
} as const;

export type SetupProvider = keyof typeof providerInstructions;

export function setupPrompt(provider: SetupProvider) {
  return `${sharedPrompt}${providerInstructions[provider]}`;
}
