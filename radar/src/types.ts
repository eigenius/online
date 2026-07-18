// Core domain types. See ../docs/newsletter-pipeline-design.md §5 and §7.
//
// Note: the archive record is `ArchiveRecord`, not `Record`, so the built-in
// `Record<K, V>` utility type stays usable throughout the codebase.

/** A topic key from config/topics.yaml (§2). */
export type TopicKey = string;

/** Canonical identity of a work (§4, stage 2). */
export interface Canonical {
  type: "arxiv" | "doi" | "url";
  value: string;
}

export type SourceKind = "paper" | "preprint" | "industry" | "opinion" | "news";

/** A raw candidate emitted by a source adapter, before normalization. */
export interface Candidate {
  /** Adapter id, e.g. "arxiv". */
  source: string;
  sourceKind: SourceKind;
  url: string;
  title: string;
  authors: string[];
  /** ISO date (YYYY-MM-DD) when available. */
  publishedAt?: string;
  abstract?: string;
  /** The adapter's best guess at a canonical id. */
  canonicalHint?: Canonical;
}

/** One place a work was seen — the dedup rollup, also a significance signal (§4, stage 3). */
export interface Sighting {
  source: string;
  url: string;
  /** ISO timestamp. */
  seen: string;
}

/** Scoring + audit trail (§5). */
export interface Signals {
  relevance?: Record<TopicKey, number>;
  significance?: number;
  citationVelocity?: number;
  judgeModel?: string;
  rationale?: string;
}

/** Filled during weekly assembly (§4, stages 8–9). */
export interface Editorial {
  summary?: string;
  summaryVerified?: boolean;
  summaryModel?: string;
  selectedIssue?: number;
}

/** A canonical archive record (§5). */
export interface ArchiveRecord {
  /** Content-addressed, e.g. "sha256:…". */
  id: string;
  canonical: Canonical;
  title: string;
  authors: string[];
  sourceKind: SourceKind;
  url: string;
  publishedAt?: string;
  /** ISO timestamp — drives "new this week". */
  firstSeen: string;
  abstract?: string;
  topics: TopicKey[];
  sightings: Sighting[];
  signals: Signals;
  editorial?: Editorial;
}

/** An embedding vector (§6.5). */
export type Vector = Float32Array;

// ---- Entities (§7) ----

export type EntityKind = "person" | "organization" | "source" | "research";

export interface Entity {
  /** e.g. "person:orcid:…", "org:ror:…", "source:example.com", "topic:neurosymbolic". */
  id: string;
  kind: EntityKind;
  displayName: string;
  canonical: { type: string; value: string };
  aliases: string[];
  links: Record<string, string>;
  /** Gates whether a public page is built (§7.6). */
  tracked: boolean;
  salience?: { items30d: number; trend: "rising" | "flat" | "falling" };
}

export type EdgeRel =
  | "authored_by"
  | "affiliated_with"
  | "published_on"
  | "about"
  | "mentions";

/** A typed link from a record to an entity (§7.2). */
export interface Edge {
  /** Record id. */
  from: string;
  rel: EdgeRel;
  /** Entity id. */
  to: string;
}
