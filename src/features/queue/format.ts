export function formatAge(createdUtc: number | null) {
  if (!createdUtc) return "recent";
  const minutes = Math.max(1, Math.floor((Date.now() - createdUtc * 1000) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatSync(value: string | null) {
  if (!value) return "No scheduled check yet";
  return `Last checked ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

export function shortHash(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "Not published";
}
