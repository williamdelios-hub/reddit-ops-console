# Setup contract

Dispatch is a self-hosted, single-operator approval queue. A setup agent configures one deployment for one Reddit account.

## Inputs

| Input | Required | Purpose |
| --- | --- | --- |
| Writing sample | No | Builds the exact voice instruction used by scheduled drafts |
| Product brief | No | Defines facts, links, claims, and boundaries the drafting agent may use |
| Composio Connect key | Yes | Provides the operator's existing Reddit OAuth connection |
| Netlify project | Yes | Hosts the private interface, functions, and Blob store |
| Codex or Claude Code | Yes | Runs the scheduled drafting workflow |

If no writing sample is supplied, the setup agent creates a plain, direct default voice profile. If no product brief is supplied, it creates a restrictive brief that forbids product claims until facts are added.

## Connections

```text
Reddit account
    │
    │ OAuth through Composio Connect
    ▼
Read-only discovery script ──► Codex or Claude scheduled run
                                      │
                                      │ proposed replies only
                                      ▼
                               Netlify Blobs queue
                                      │
                                      │ private review and edit
                                      ▼
                               Human clicks Send reply
                                      │
                                      ▼
                           Composio posts one Reddit reply
```

## Secrets

- `COMPOSIO_CONNECT_API_KEY` authorizes the connected Reddit account.
- `OPS_ACCESS_KEY` is the operator's login token.
- `SESSION_SECRET` signs private browser sessions.
- `DISPATCH_INGEST_KEY` lets the scheduled agent read its profile and add draft batches.

Secrets are server-only. The setup agent stores them in Netlify and in `.dispatch.env` on the operator's machine. `.dispatch.env` is ignored by Git and should have owner-only file permissions.

## Persistent state

Netlify Blobs stores:

- the exact voice instruction used by scheduled runs
- the product brief used by scheduled runs
- setup fingerprints and scheduler status
- draft batches, edits, skipped items, and sent history

## Safety boundary

Scheduled work can read Reddit and write drafts to Dispatch. It cannot invoke `send-reply`. Publishing requires a valid private browser session and a same-origin manual request from the `Send reply` button.

## Completion criteria

Setup is complete only when:

1. Reddit reports an active connected account.
2. The voice instruction and product brief are published and visible in the private Setup view.
3. The schedule is active in Codex or Claude Code.
4. A read-only discovery run succeeds.
5. The operator receives the generated login token.
6. No test reply is posted to Reddit.
