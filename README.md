# Dispatch

A private, human-controlled Reddit reply queue. Dispatch reads recent threads from the connected Reddit account, removes comments that already received an owner reply, drafts responses in the owner's existing style, and posts only when the operator clicks Send reply.

## Architecture

- React and Vite frontend
- Netlify Functions backend
- Access-key session with an HTTP-only signed cookie
- Composio Connect for the existing Reddit OAuth account, thread discovery, reply generation, and posting
- Automatic unanswered-comment detection across recent authored threads
- Local browser storage for edited drafts, skipped items, and recent-send history
- No database, signup flow, password recovery, or autonomous posting

## Local development

1. Copy `.env.example` to `.env` and fill the values.
2. Run `npm install`.
3. Run `npm run dev:netlify`.

The plain Vite command serves the interface but does not emulate the Netlify Functions.

## Production environment

Set all values from `.env.example` in Netlify. `COMPOSIO_CONNECT_API_KEY`, `OPS_ACCESS_KEY`, and `SESSION_SECRET` must never be exposed to the client.
