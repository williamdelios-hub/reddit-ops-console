# Dispatch scheduled runbook

This job discovers unanswered Reddit comments and creates drafts for manual review. It must never publish, reply, edit, delete, vote, message, or otherwise mutate Reddit.

## Run sequence

1. Work from `/Users/williamdelios/reddit-ops-console`.
2. Read `automation/AGENTICKS_REDDIT_VOICE.md` completely.
3. Run `npm run reddit:fetch -- --output /tmp/dispatch-reddit-context.json`.
4. Read `/tmp/dispatch-reddit-context.json` completely.
5. For each candidate, decide whether a reply adds value. Skip empty hostility, bot messages, reminders, jokes that need no answer, and comments already represented in Dispatch.
6. Draft in the owner's adaptive voice. Use only facts supported by the supplied thread context and the voice profile. Never invent current product behavior, pricing, users, performance, release status, or technical claims.
7. Write `/tmp/dispatch-drafts.json` with this structure:

```json
{
  "batchId": "codex-YYYYMMDD-HHmmss",
  "createdAt": "ISO-8601 timestamp",
  "owner": "reddit username from context",
  "accountId": "account id from context",
  "scannedPosts": 0,
  "items": [
    {
      "thingId": "t1_...",
      "commentId": "...",
      "author": "...",
      "body": "...",
      "permalink": "https://www.reddit.com/...",
      "createdUtc": 0,
      "score": 0,
      "depth": 0,
      "postId": "...",
      "postTitle": "...",
      "subreddit": "...",
      "postPermalink": "https://www.reddit.com/...",
      "draft": "proposed reply",
      "rationale": "brief private reason for the chosen response mode"
    }
  ]
}
```

8. Copy candidate fields exactly from the discovery output. Add only `draft` and `rationale`.
9. If no candidates merit a reply, still ingest an empty batch so Dispatch records a successful check.
10. Run `npm run reddit:ingest -- --input /tmp/dispatch-drafts.json`.
11. Report the number discovered, drafted, skipped, and ingested. Do not report or expose secrets.

## Absolute execution boundary

The discovery script is read-only. The ingestion script writes only to the private Dispatch queue. The only Reddit posting action exists behind the authenticated `Send reply` button in the Dispatch UI. Do not call that endpoint or any Reddit posting tool from this automation.
