# Dispatch

A private, human-controlled Reddit reply queue. A scheduled Codex job reads recent threads, proposes replies in the owner's voice, and saves batches to Dispatch. Reddit is changed only when the authenticated operator clicks **Send reply**.

## Architecture

- React and Vite frontend
- Netlify Functions backend
- Netlify Blobs for persistent draft batches, edits, skipped items, and sent history
- Access-key session with an HTTP-only signed cookie
- Composio Connect for the existing Reddit OAuth account
- Read-only Reddit discovery in `scripts/fetch-reddit-context.mts`
- Secure draft-only ingestion in `scripts/ingest-drafts.mts`
- Manual-only posting in `netlify/functions/send-reply.mts`
- No signup flow, password recovery, Supabase project, or autonomous posting

## Scheduled drafting

The permanent voice and product constraints live in `automation/AGENTICKS_REDDIT_VOICE.md`. The standalone Codex job follows `automation/AUTOMATION_RUNBOOK.md`.

Discovery is read-only:

```bash
npm run reddit:fetch -- --output /tmp/dispatch-reddit-context.json
```

After Codex creates a reviewed JSON batch, it is sent only to Dispatch:

```bash
npm run reddit:ingest -- --input /tmp/dispatch-drafts.json
```

Neither command has a Reddit posting action.

## Local development

1. Copy `.env.example` to `.env` and fill the values.
2. Run `npm install`.
3. Run `npm run dev:netlify`.

The plain Vite command serves the interface but does not emulate Netlify Functions. Netlify Dev uses a local Blobs sandbox and does not read production queue data.

## Production environment

Set all values from `.env.example` in Netlify. Every value is server-only and must never be exposed to the client. The scheduled machine can read `COMPOSIO_CONNECT_API_KEY` and `DISPATCH_INGEST_KEY` from environment variables or the corresponding macOS Keychain services.
