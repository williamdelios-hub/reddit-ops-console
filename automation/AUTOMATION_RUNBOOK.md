# Dispatch scheduled runbook

Discover unanswered Reddit comments, write proposed replies, and save them for human review. Never publish or mutate Reddit.

## Run sequence

1. Work from the Dispatch repository root.
2. Run `npm run reddit:fetch -- --output /tmp/dispatch-reddit-context.json`.
3. Read `/tmp/dispatch-reddit-context.json` completely.
4. Treat `operatorProfile.voice.content` as the exact voice instruction for this run.
5. Treat `operatorProfile.productBrief.content` as the product and factual source for this run.
6. If either operator document is missing, stop without drafting and report that setup is incomplete.
7. Review every candidate. Skip bots, reminders, empty hostility, comments already represented in Dispatch, and comments where a reply adds no value.
8. Use only facts supported by the current thread context and product brief. Never invent pricing, users, performance, release status, technical behavior, or validation claims.
9. Write `/tmp/dispatch-drafts.json` with this structure:

```json
{
  "batchId": "agent-YYYYMMDD-HHmmss",
  "createdAt": "ISO-8601 timestamp",
  "owner": "reddit username from context",
  "accountId": "account id from context",
  "scannedPosts": 0,
  "discoveredCount": 0,
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
      "rationale": "private reason for the response mode"
    }
  ]
}
```

10. Copy candidate fields exactly from discovery output. Add only `draft` and `rationale`.
11. Ingest an empty batch when nothing merits a reply. This records a successful check.
12. Run `npm run reddit:ingest -- --input /tmp/dispatch-drafts.json`.
13. Report discovered, drafted, skipped, and ingested counts without exposing secrets or private profile text.

## Execution boundary

The discovery script reads Reddit. The ingestion script writes to Dispatch. Neither script can publish to Reddit. The only publishing path is the authenticated `Send reply` button in the private web interface.
