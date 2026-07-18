// robots.txt gate (design §6.1). A minimal but real check: honor the `Disallow`
// rules of the wildcard (`User-agent: *`) group. Missing/unreadable robots.txt
// means allowed (standard). Not a full spec implementation (ignores Allow,
// wildcards, and crawl-delay) — enough to be polite before fetching a page.
const cache = new Map<string, string[]>(); // origin -> disallowed path prefixes

function parseDisallow(txt: string): string[] {
  const out: string[] = [];
  let applies = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") applies = val === "*";
    else if (key === "disallow" && applies && val) out.push(val);
  }
  return out;
}

async function disallowedPaths(origin: string): Promise<string[]> {
  const cached = cache.get(origin);
  if (cached) return cached;
  let paths: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": "eigenius-radar/0.0.1" },
    });
    if (res.ok) paths = parseDisallow(await res.text());
    else await res.body?.cancel();
  } catch {
    // network error / no robots.txt → treat as allowed
  }
  cache.set(origin, paths);
  return paths;
}

export async function isAllowed(url: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const paths = await disallowedPaths(u.origin);
  return !paths.some((p) => u.pathname.startsWith(p));
}
