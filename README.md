# Dispatch

Dispatch is a self-hosted Reddit reply queue for people who want an agent to do the reading and drafting without giving it permission to publish.

Codex or Claude Code checks recent threads, writes replies from a private voice profile and product brief, and saves them to a review queue. You edit the words and click **Send reply**. That click is the only publishing path.

## What it does

- Finds unanswered comments across recent posts from one connected Reddit account
- Keeps writing style and product facts in separate private documents
- Runs scheduled drafting with Codex or Claude Code
- Stores batches, edits, skipped comments, and sent history in Netlify Blobs
- Shows the exact voice instruction and product brief used by the scheduler
- Posts one reply only after an authenticated, same-origin button click

## Set up with your coding agent

Open the deployed landing page and copy either setup prompt, or give your agent this repository and say:

> Set up Dispatch for me. Follow `docs/SETUP_CONTRACT.md`. Before starting, ask me for a separate optional writing sample and product brief. Do not post anything to Reddit during setup.

The agent will:

1. Create a private voice instruction and product brief.
2. Link a Netlify site and your Composio Reddit connection.
3. Generate the server secrets and one login token.
4. Deploy the private queue.
5. Publish the exact drafting context to your deployment.
6. Create a four-times-daily Codex automation or Claude Code scheduled task.
7. Run a read-only verification.

See [the setup contract](docs/SETUP_CONTRACT.md) for the complete connection map and completion criteria.

## Manual setup

Requirements:

- Node.js 22 or newer
- A Netlify account and linked project
- A Composio Connect consumer key with one Reddit account connected
- Codex or Claude Code for scheduled drafting

```bash
npm install
npx netlify init
npm run setup:init -- --provider codex
```

Create the two private files from the templates:

```text
automation/operator/VOICE.md
automation/operator/PRODUCT_BRIEF.md
```

Then configure `COMPOSIO_CONNECT_API_KEY` in Netlify, deploy, and publish the profile:

```bash
npm run build
npx netlify deploy --prod --dir=dist
npm run setup:publish -- \
  --provider codex \
  --name "Your name" \
  --cadence "8am, noon, 4pm, and 8pm"
```

The private operator files and `.dispatch.env` are ignored by Git.

## Scheduling notes

- [Codex automations](https://developers.openai.com/codex/app/automations) can run against the local project. The machine and Codex app must be running at the scheduled time.
- [Claude Code scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks) support local Desktop tasks and cloud Routines. Use a durable task for Dispatch rather than a session-only loop.

## Development

```bash
npm run dev:netlify
npm run typecheck
npm test
npm run build
```

Netlify Dev uses a local Blob sandbox. It does not read the production queue.

## Architecture

The browser never receives Reddit or ingestion credentials. Netlify Functions own authentication, storage, and the one manual publishing endpoint. Scheduled agents receive only the read and draft-ingestion workflow described in [the runbook](automation/AUTOMATION_RUNBOOK.md).

For the full data path, read [the setup contract](docs/SETUP_CONTRACT.md).

## Security model

Dispatch is intentionally single-operator. It does not provide signup, password recovery, teams, or a public API for posting.

- Sessions are signed, HTTP-only, and SameSite Strict.
- Draft ingestion uses a separate bearer token.
- Editing and sending require a valid browser session and same-origin request.
- A queued item is marked as sending before Reddit is called, preventing accidental duplicate approval.
- Scheduled scripts have no route that publishes to Reddit.

Please report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

MIT
