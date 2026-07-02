export function buildQueueProgram(owner: string, accountId: string) {
  const ownerLiteral = JSON.stringify(owner);
  const accountLiteral = JSON.stringify(accountId);

  return String.raw`import json
owner = ${ownerLiteral}
account_id = ${accountLiteral}

search_response, search_error = run_composio_tool(
    "REDDIT_SEARCH_ACROSS_SUBREDDITS",
    {"search_query": "author:" + owner, "sort": "new", "limit": 10, "restrict_sr": False},
    account=account_id
)
if search_error:
    print(json.dumps({"error": search_error}))
else:
    search_data = (search_response or {}).get("data") or {}
    posts = search_data.get("posts") or (((search_data.get("data") or {}).get("posts")) or [])
    posts = [p for p in posts if (p.get("num_comments") or 0) > 0 and not p.get("locked") and not p.get("archived")]
    posts = sorted(posts, key=lambda p: p.get("created_utc") or 0, reverse=True)[:4]
    candidates = []
    style_examples = []
    post_contexts = []

    for post in posts:
        post_id = post.get("id")
        if not post_id:
            continue
        thread, thread_error = proxy_execute(
            "GET",
            "/comments/" + post_id,
            "reddit",
            query_params={"limit": "100", "depth": "10", "sort": "new", "raw_json": "1"}
        )
        if thread_error or not isinstance(thread, list) or len(thread) < 2:
            continue
        post_data = (((thread[0].get("data") or {}).get("children") or [{}])[0].get("data") or {})
        roots = ((thread[1].get("data") or {}).get("children") or [])
        flat = []

        def flatten(nodes):
            for node in nodes or []:
                if not isinstance(node, dict) or node.get("kind") != "t1":
                    continue
                data = node.get("data") or {}
                replies = data.get("replies")
                children = (((replies.get("data") or {}).get("children") or []) if isinstance(replies, dict) else [])
                flat.append((data, children))
                flatten(children)

        flatten(roots)
        by_name = {data.get("name"): data for data, _ in flat if data.get("name")}
        root_name = post_data.get("name") or ("t3_" + post_id)

        for data, children in flat:
            author = data.get("author") or ""
            body = data.get("body") or ""
            if author == owner and body not in ["[deleted]", "[removed]"]:
                style_examples.append(body)
                continue
            parent_id = data.get("parent_id") or ""
            parent = by_name.get(parent_id) or {}
            directly_to_owner = parent_id == root_name or parent.get("author") == owner
            owner_replied = any(
                ((child or {}).get("data") or {}).get("author") == owner
                for child in children
                if isinstance(child, dict) and child.get("kind") == "t1"
            )
            normalized_author = author.lower()
            if (
                directly_to_owner
                and not owner_replied
                and author not in [owner, "[deleted]", "AutoModerator"]
                and not normalized_author.endswith("bot")
                and body not in ["[deleted]", "[removed]"]
                and len(body.strip()) >= 12
            ):
                permalink = data.get("permalink") or ""
                if permalink.startswith("/"):
                    permalink = "https://www.reddit.com" + permalink
                candidates.append({
                    "thingId": data.get("name"),
                    "commentId": data.get("id"),
                    "author": author,
                    "body": body,
                    "permalink": permalink,
                    "createdUtc": data.get("created_utc"),
                    "score": data.get("score"),
                    "depth": data.get("depth"),
                    "postId": post_id,
                    "postTitle": post_data.get("title") or post.get("title"),
                    "subreddit": post_data.get("subreddit") or post.get("subreddit"),
                    "postPermalink": "https://www.reddit.com" + (post_data.get("permalink") or "")
                })

        post_contexts.append({
            "id": post_id,
            "title": post_data.get("title") or post.get("title"),
            "selftext": (post_data.get("selftext") or post.get("selftext") or "")[:7000]
        })

    deduped = {}
    for candidate in sorted(candidates, key=lambda item: item.get("createdUtc") or 0, reverse=True):
        if candidate.get("thingId") and candidate.get("thingId") not in deduped:
            deduped[candidate["thingId"]] = candidate
    candidates = list(deduped.values())[:16]

    if not candidates:
        print(json.dumps({"owner": owner, "scannedPosts": len(posts), "drafts": []}))
    else:
        prompt = """Draft replies for this Reddit account owner. Return ONLY a JSON array. Each object must contain thingId, shouldReply, draft, and rationale.

Rules:
- Reply only where the comment directly addresses the owner and a substantive response adds value.
- Skip jokes, reminders, empty hostility, and comments that need no answer.
- Match the supplied owner writing examples: direct, candid, technically literate, and human.
- Answer the actual point first. Do not open with generic praise or "thanks for asking".
- Never invent product behavior, performance, customers, returns, pricing, technical guarantees, or validation methods.
- A product claim is allowed only when it appears explicitly in the supplied post context or owner style examples.
- When facts are insufficient, answer narrowly, state the limitation, or ask a useful clarifying question.
- Do not sound promotional unless the commenter explicitly asks how to access something.
- No em dash characters. No emoji. No mention of AI drafting, automation, or this queue.
- Keep most replies between 40 and 180 words.
"""
        prompt += "\nPOST CONTEXT:\n" + json.dumps(post_contexts)
        prompt += "\n\nOWNER STYLE EXAMPLES:\n" + json.dumps(style_examples[:24])
        prompt += "\n\nUNANSWERED COMMENTS:\n" + json.dumps(candidates)
        llm_response, llm_error = invoke_llm(prompt)
        if llm_error:
            print(json.dumps({"error": llm_error}))
        else:
            cleaned = llm_response.strip()
            fence = chr(96) * 3
            if cleaned.startswith(fence):
                cleaned = cleaned.split("\n", 1)[1].rsplit(fence, 1)[0]
                if cleaned.lstrip().startswith("json"):
                    cleaned = cleaned.lstrip()[4:].lstrip()
            try:
                generated = json.loads(cleaned)
            except Exception as parse_error:
                print(json.dumps({"error": "Draft generation returned invalid JSON"}))
            else:
                source_by_id = {item["thingId"]: item for item in candidates}
                drafts = []
                for generated_item in generated if isinstance(generated, list) else []:
                    source = source_by_id.get(generated_item.get("thingId"))
                    draft = (generated_item.get("draft") or "").strip()
                    if not source or not generated_item.get("shouldReply") or not draft:
                        continue
                    draft = draft.replace(chr(8212), ",").replace(chr(8211), "-").replace(chr(8209), "-")
                    drafts.append({**source, "draft": draft, "rationale": generated_item.get("rationale") or ""})
                print(json.dumps({"owner": owner, "scannedPosts": len(posts), "drafts": drafts[:12]}))`;
}

export function parseWorkbenchOutput(stdout: string) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      continue;
    }
  }
  throw new Error("Draft generation returned no usable result");
}
