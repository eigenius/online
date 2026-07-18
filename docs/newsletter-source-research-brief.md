# Source research brief — Eigenius newsletter radar

**For:** whoever is compiling the source list · **Goal:** a vetted list of
websites we can harvest weekly for the community newsletter.

## Context (what this is for)

We run an automated "research radar" that scans the web weekly for notable new
work in our topic areas, then drafts a newsletter highlighting the most
interesting items with a short summary and a link to the source. It already
pulls **scientific papers** from arXiv automatically. What it's missing is
everything written by **humans in the field** — company and lab announcements,
industry news, and commentary from opinion leaders. That's what we need you to
find.

Concretely: we need a list of **websites with an RSS/Atom feed** (or, failing
that, a clean blog/news index page) that regularly publish on our topics.

## Topic focus

We care about the intersection of AI and *verifiable, rigorous* science:

1. **Neurosymbolic techniques** — combining neural networks with symbolic
   reasoning, program synthesis, knowledge graphs.
2. **AI Scientists / AI-supported research** — autonomous research agents,
   hypothesis generation, self-driving labs, lab automation.
3. **Formal verification of / with AI** — verifying model outputs,
   proof-carrying reasoning, LLM-assisted theorem proving.
4. **Verified science & reproducibility** — machine-checkable claims, auditable
   pipelines, reproducibility infrastructure.
5. **Formal methods in science & engineering** — theorem proving (Lean, Coq,
   Isabelle), model checking, type systems, SMT applied to real problems.
6. **AI-science for Life Sciences & Medicine** — protein/molecule models, drug
   discovery, clinical reasoning, computational biology.

A source doesn't have to hit all six — one or two, consistently, is plenty.

## Already covered — please skip

These come in through data APIs, not web feeds, so **don't** research them:
arXiv, Semantic Scholar, bioRxiv/medRxiv, OpenReview, Crossref. Focus on the
human-written **blogs, news, and commentary** below.

## What to look for (categories + starting candidates)

The names below are **starting candidates to check**, not a vetted list —
confirm each one actually publishes on our topics and find its feed URL. Add any
good ones you discover that aren't listed.

### A. Company & lab blogs (industry announcements)

- **Frontier AI labs** (only their science/verification-relevant posts): Google
  DeepMind, Anthropic, OpenAI, Meta FAIR, Microsoft Research, Allen Institute
  for AI (AI2).
- **AI-for-science companies:** FutureHouse, Lila Sciences, Sakana AI, Isomorphic
  Labs, Recursion / Valence Labs, EvolutionaryScale, Chai Discovery, Profluent,
  Cradle, Iambic, Insilico Medicine, Arc Institute, Owkin.
- **Formal methods / verified reasoning:** Lean FRO, Harmonic, Axiom, Galois,
  AWS Automated Reasoning, Mathstral/Mistral (math posts).
- **Neurosymbolic:** MIT-IBM Watson AI Lab, Symbolica AI, Numenta.

### B. Research-group & institution blogs

Academic labs and centers that blog on these topics — e.g. the Xena project
(Lean/mathematics), SIGPLAN blog (PL & verification), Center for Open Science
(reproducibility), university groups in program synthesis, comp-bio, or AI-for-
science. Institutional AI-in-science newsrooms count too.

### C. Opinion leaders (individual blogs & Substacks)

Researchers and commentators who write regularly and with signal on these
topics. Starting candidates to check for feeds: Gary Marcus (Marcus on AI),
Terence Tao, Kevin Buzzard, Ben Recht (arg min), Sebastian Raschka, Simon
Willison, François Chollet. Add domain-specific voices in formal methods,
comp-bio, and AI-for-science.

### D. News & analysis outlets

Higher-signal outlets (skip general tech-gossip): Quanta Magazine (excellent on
math, formal methods, and science), Nature and Science news sections (AI-in-
science coverage), MIT Technology Review, Import AI (Jack Clark), The Batch
(DeepLearning.AI). Prefer topic-specific feeds/tags where the site offers them.

## Selection criteria

**Include** a source if it:

- publishes on at least one of the six topics, more than a few times a year;
- is a **primary/high-signal** voice (a lab announcing its own work, a
  researcher's own writing, or serious analysis) — not aggregated rehash;
- has an RSS/Atom feed **or** a stable index page we can point at.

**Exclude / de-prioritize:** pure marketing or press-release wires, SEO content
farms, sources that are almost never on-topic, and anything paywalled with no
readable abstract/landing page. Social media accounts are lowest priority for
now.

**Finding the feed:** many blogs have an unadvertised feed — try appending
`/feed`, `/rss`, `/rss.xml`, `/atom.xml`, or `/feed.xml` to the blog URL, or
check the page source for a `<link rel="alternate" type="application/rss+xml">`.
Note it if you find one; note "no feed" if you don't (we can still handle those).

## What to hand back (per source)

A simple table/spreadsheet with these columns — it maps straight into our config:

| Column | Meaning | Example |
| --- | --- | --- |
| `name` | Short label | DeepMind Blog |
| `url` | The blog/news homepage | https://deepmind.google/discover/blog/ |
| `feed_url` | RSS/Atom feed, or "none" | https://deepmind.google/blog/rss.xml |
| `category` | industry \| opinion \| news | industry |
| `topics` | Which of the six (one or more) | ai-scientist, ai-life-sciences |
| `cadence` | Rough post frequency | ~weekly |
| `notes` | On-topic? paywalled? caveats | mixed; filter to science posts |

Topic keys to use in the `topics` column: `neurosymbolic`, `ai-scientist`,
`formal-verification`, `verified-science`, `formal-methods`, `ai-life-sciences`.

## Priorities

If time is limited, prioritize in this order:

1. **AI-for-science companies** and **formal-methods/verification orgs** (B & A)
   — this is our sharpest, least-covered niche.
2. **Opinion leaders** with real feeds (C).
3. **Quanta + Nature/Science** science-news feeds (D).

A first batch of **20–30 solid sources** across the categories is more than
enough to launch; we can grow the list over time.
