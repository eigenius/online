# Eigenius Perspective — One-Page Quick-Start

*Companion to the full guide. Keep this open while drafting; reach for the full guide when you need the reasoning behind a point.*

## The position, in one sentence

Reasoning behind an AI-produced claim must be **verifiable**, not merely produced, logged, explained, or attested. Fluency is not soundness; a confident conclusion is not a checked one; in science the reasoning *is* the deliverable, not scaffolding you discard once the answer arrives.

## The two frames you'll use most

- **Oracle vs. instrument.** An oracle emits an answer you must trust. An instrument shows its work so you can check it. Most AI in science is oracle-shaped; it must become instrument-shaped. Most failures people report (hallucinated citations, overconfident qualifiers, silent retrieval gaps) are symptoms of oracle-shaped deployment — name that.
- **Plural logics, formal bridges.** Science has no single correct form of reasoning — an assay, a docking geometry, a PK derivation, a proof are genuinely different logics. But the bridges between them must be more than Python scripts and prose. A script preserves shape; prose preserves nothing checkable. Cross-domain handoffs are where meaning silently corrupts, which is why bridges have to be formal (comorphisms with a satisfaction condition), not glue code.

## Verification is not the things it's confused with

| Verification is **not**… | Because… |
|---|---|
| **logging / provenance** | records *that* something happened, not that the reasoning was sound |
| **explanation** | a plausible narrative about reasoning ≠ the reasoning being checkable |
| **attestation** | a vendor vouching for a chain it's part of is not an audit |
| **consensus** | two systems can agree and both be wrong |

Behavioral invariants (crash, leak, latency) are enough for software. Science needs **epistemic** invariants: what was declared, observed, derived, verified.

## The four epistemic categories

Every claim is classified by how it's known: **declared · observed · derived · verified.** A claim that is merely *declared* is not thereby *verified* — conflating them is the failure we point at.

## Deployable one-liners

- *Capture is not verification.*
- *Detectable becomes underivable.* (timestamps make bad cross-time inference catchable; structure makes it impossible)
- *Confidence decoupled from recall.* (a human with 10% recall hedges; the system asserts as if it had 100% — and audit fatigue means the expert eventually stops checking)
- *Boundary vs. interior:* software checks behavior at the edge; science needs the reasoning checked through the interior, because the interior is the deliverable.
- *Decentralization requires an auditor* — one that sits outside every vendor, because no participant can certify a chain it's part of.
- *Science is multi-logic, but the bridges must be more than scripts and prose* — formal enough to check meaning survives the crossing.

## How we engage (the "one step further" move)

Grant the author's strongest point sincerely, in their own words. Then show their premise implies more than they claimed, or their fix stops one layer short. The conclusion should feel *latent in their own reasoning*, not imported to defeat them.

- Concede specifically before adding anything.
- Locate the disagreement narrowly: "you're right about X; the gap is the adjacent thing you didn't name."
- Quote their own phrasing back when it already contains the tension.
- End on the sharpest line; don't dilute with a soft close.
- Peers engaging peers — not deferential, not combative, not promotional.

## Don't

- **Don't pitch.** Name Eigenius once, late, or not at all. On posts reporting harm or asking a genuine question, restraint beats a mention.
- **Don't overclaim.** Operational is operational; forthcoming is forthcoming. A wrong number in front of an expert costs more than it buys.
- **Don't fabricate corroboration.** Engage the *logic* of someone's findings; don't claim you reproduced results you didn't.
- **Don't sound generated.** No "sharpest take I've seen," no "this resonates," no tricolon drumbeat. Use "not X but Y" at most once per piece.

## The test

Does the piece argue, at bottom, that reasoning should be *verifiable* rather than merely produced, logged, explained, or attested — by extending someone's argument rather than opposing it, concretely rather than in slogans, generously rather than promotionally? Then it's ours.