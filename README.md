# Dispatch

A private, human-controlled Reddit reply console. Dispatch parses a Reddit URL, lets the operator write and preview a reply, and posts only after an explicit confirmation click.

## Architecture

- React and Vite frontend
- Netlify Functions backend
- Access-key session with an HTTP-only signed cookie
- Composio managed OAuth connection for Reddit
- Local browser storage for drafts and recent-send history
- No database, signup flow, password recovery, or autonomous posting

## Local development

1. Copy `.env.example` to `.env` and fill the values.
2. Run `npm install`.
3. Run `npm run dev:netlify`.

The plain Vite command serves the interface but does not emulate the Netlify Functions.

## Production environment

Set all values from `.env.example` in Netlify. `COMPOSIO_API_KEY`, `OPS_ACCESS_KEY`, and `SESSION_SECRET` must never be exposed to the client.
