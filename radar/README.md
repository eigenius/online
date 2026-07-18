# radar

The research-radar & newsletter pipeline for the Eigenius community site. Scans the web for work on
the site's topics, archives it, and each week drafts a newsletter issue, topic recommendations, and
entity-index page data.

Design: [`../docs/newsletter-pipeline-design.md`](../docs/newsletter-pipeline-design.md). Stack:
**Deno + TypeScript with hosted embeddings (Voyage AI)** — §9 of the design.

## Status — Phase 0 scaffold

The structure and interfaces are in place. One vertical slice is **working**: the arXiv adapter →
normalize → cheap relevance gate → JSONL archive. Everything else (dedup, embeddings, the libSQL
index, entity resolution, the agentic stages, rendering, and the PR publisher) is a **typed stub**
with a `// TODO` pointing at the design section it implements.

## Run

```sh
cd radar
deno task doctor                 # validate config + report which secrets are set
deno task harvest --dry-run      # fetch arXiv, normalize, gate — no writes
deno task harvest                # …and append kept records to ./archive/
deno task test                   # unit tests
deno task check                  # typecheck + lint + fmt
```

`doctor` and `harvest` need network; `harvest` writes under `./archive/` (gitignored). The agentic
stages need `ANTHROPIC_API_KEY`; embeddings use **Vertex AI**, so set `GOOGLE_CLOUD_PROJECT` (and
optionally `VERTEX_LOCATION`) and authenticate with `gcloud auth application-default login`. A
GitHub token is needed later for the PR publisher.

## Layout

See design §10. In short: `sources/` `fetch/` `pipeline/` `store/` `embeddings/` `entities/` are
deterministic and Claude-free; only `agents/` calls Claude, and only the weekly `assemble` job uses
it. `jobs/` are thin orchestrators; `bin/radar.ts` is the CLI the workflows call.

`.github/workflows/*.yml` are **templates** — move them to the repository root `.github/workflows/`
(or into a standalone `eigenius/radar` repo) to activate.
