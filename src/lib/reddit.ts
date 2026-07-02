export type RedditTarget = {
  thingId: string;
  kind: "post" | "comment";
  sourceUrl: string;
  permalink: string | null;
  subreddit: string | null;
};

const THING_ID = /^(t1|t3)_([a-z0-9]+)$/i;
const REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "new.reddit.com",
  "redd.it",
  "www.redd.it",
]);

export function parseRedditTarget(input: string): RedditTarget | null {
  const sourceUrl = input.trim();
  if (!sourceUrl) return null;

  const direct = sourceUrl.match(THING_ID);
  if (direct) {
    const prefix = direct[1].toLowerCase();
    return {
      thingId: `${prefix}_${direct[2].toLowerCase()}`,
      kind: prefix === "t1" ? "comment" : "post",
      sourceUrl,
      permalink: null,
      subreddit: null,
    };
  }

  let url: URL;
  try {
    url = new URL(sourceUrl.startsWith("http") ? sourceUrl : `https://${sourceUrl}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!REDDIT_HOSTS.has(host)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (host.endsWith("redd.it")) {
    const postId = parts[0]?.toLowerCase();
    if (!postId || !/^[a-z0-9]+$/.test(postId)) return null;
    return {
      thingId: `t3_${postId}`,
      kind: "post",
      sourceUrl,
      permalink: `https://www.reddit.com/comments/${postId}/`,
      subreddit: null,
    };
  }

  const commentsIndex = parts.findIndex((part) => part.toLowerCase() === "comments");
  if (commentsIndex === -1) return null;

  const postId = parts[commentsIndex + 1]?.toLowerCase();
  if (!postId || !/^[a-z0-9]+$/.test(postId)) return null;

  const possibleCommentId = parts[commentsIndex + 3]?.toLowerCase();
  const hasCommentId = Boolean(possibleCommentId && /^[a-z0-9]+$/.test(possibleCommentId));
  const subredditIndex = parts.findIndex((part) => part.toLowerCase() === "r");
  const subreddit = subredditIndex >= 0 ? parts[subredditIndex + 1] ?? null : null;

  return {
    thingId: hasCommentId ? `t1_${possibleCommentId}` : `t3_${postId}`,
    kind: hasCommentId ? "comment" : "post",
    sourceUrl,
    permalink: url.href,
    subreddit,
  };
}
