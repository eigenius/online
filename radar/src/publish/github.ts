// Open a pull request against eigenius/online with the draft issue and any
// entity-index data (design §4, stage 12; §10). Dependency-free: talks to the
// GitHub REST API with a token from the environment. The human editor reviews,
// flips `draft: false`, and merges — which triggers the existing Pages deploy.
export interface FileChange {
  /** Repo-relative path, e.g. src/content/newsletter/007-…md. */
  path: string;
  content: string;
}

export interface PullRequestOptions {
  owner?: string; // default "eigenius"
  repo?: string; // default "online"
  base?: string; // default "main"
  branch: string; // head branch to create
  title: string;
  body: string;
  token?: string; // default $GITHUB_TOKEN
}

const API = "https://api.github.com";

async function gh(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path} -> ${res.status}: ${await res.text()}`);
  return await res.json() as Record<string, unknown>;
}

/** Create a branch, commit the files onto it, and open a PR. Returns the PR URL. */
export async function openPullRequest(
  files: FileChange[],
  opts: PullRequestOptions,
): Promise<string> {
  const token = opts.token ?? Deno.env.get("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN not set");
  const owner = opts.owner ?? "eigenius";
  const repo = opts.repo ?? "online";
  const base = opts.base ?? "main";
  const p = `/repos/${owner}/${repo}`;

  // 1. Base branch head SHA.
  const ref = await gh(token, "GET", `${p}/git/ref/heads/${base}`);
  const baseSha = (ref.object as { sha: string }).sha;

  // 2. Create the head branch.
  await gh(token, "POST", `${p}/git/refs`, {
    ref: `refs/heads/${opts.branch}`,
    sha: baseSha,
  });

  // 3. Put each file on the new branch (one commit per file).
  for (const f of files) {
    await gh(token, "PUT", `${p}/contents/${f.path}`, {
      message: `radar: add ${f.path}`,
      content: btoa(unescape(encodeURIComponent(f.content))),
      branch: opts.branch,
    });
  }

  // 4. Open the PR.
  const pr = await gh(token, "POST", `${p}/pulls`, {
    title: opts.title,
    head: opts.branch,
    base,
    body: opts.body,
  });
  return String(pr.html_url);
}
