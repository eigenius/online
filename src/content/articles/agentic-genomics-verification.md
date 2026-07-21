---
title: "Testing Tells You How Hard to Look. Verification Can Make Some Failures Impossible."
subtitle: "A response to 'Agentic genomics: From pipeline automation to autonomous validation' (Corpas, Guio & Fatumo)."
description: >-
  A response to Corpas, Guio & Fatumo on agentic genomics: their tiered
  validation framework calibrates how hard to look for silent failures, but
  several of the failure modes it catalogs are structural — and typed
  contracts can make those impossible to express rather than merely
  improbable.
pubDate: 2026-07-21
tags: ["formal-verification", "agentic-ai", "genomics", "commentary"]
image: ../../assets/articles/agentic-genomics-verification.png
imageAlt: >-
  Split scene: on the left a magnifying lens sweeps a grid of specimen
  slides, most of them unexamined in shadow; on the right a precision keyed
  gate physically rejects a malformed sample, annotated "sample rejection"
  and "retain path".
---

[Agentic genomics: From pipeline automation to autonomous validation](https://www.cell.com/cell-genomics/fulltext/S2666-979X(26)00167-9), an open-access Perspective in *Cell Genomics* by Manuel Corpas, Heinner Guio, and Segun Fatumo, is the rare piece that names its central problem exactly. The bottleneck in agentic genomics, the authors argue, has moved from constructing analyses to validating them, and the characteristic danger is not loud failure but **silent degradation to plausible-looking but incorrect results**. The examples are the right ones: a pharmacogenomic skill returning "all-normal" dosages for 51 drugs from an empty input file; an agent silently mixing GRCh37 and GRCh38 coordinates to produce variant calls that pass format validation and mean nothing; a tool run out of distribution that completes and returns results without flagging the shift. The tiered validation framework they propose — research, benchmarked, clinical — is a necessary and well-constructed response.

It is also, in its entirety, a *testing-and-governance* response to a problem that has a *verification* dimension the framework points toward but does not reach. That gap is worth naming, because closing it changes what some of these failures are.

## Replay is the tell

The clearest signal is in the clinical-grade tier's own requirement. The authors write that agents must expose a deterministic replay mode: "given a logged sequence of decisions, it must be possible to reproduce the exact execution path." This is presented as an auditability guarantee. It is not one — or rather, it is a guarantee of the wrong thing.

Replay lets you reproduce *what happened*. It does not check that what happened was *correct*. A silent failure that is deterministically replayable is still a silent failure; you have simply made the wrong answer reproducible. Capturing the execution trace and verifying that the execution was sound are different guarantees, and the framework reaches for the first where the problem demands the second. This is not a criticism of including replay — provenance is worth having — but it marks precisely where the field is substituting logging for checking.

The same pattern runs through the adversarial test suites. The paper celebrates, rightly, that ClawBio's empty-file failure was fixed: the skill now halts with a file-format error rather than returning an all-normal report. But that fix closed *one* input that *one* auditor happened to try. Testing catches the failures you think to test for. The coordinate mix, the dropped low-quality reads, the population mismatch — these are the members of the silent-failure class that nobody wrote a test for, and no finite adversarial suite closes the class. Testing reduces the probability of silent failure. It cannot certify its absence.

## Some of these failures are structural, not statistical

The important observation is that many of the failure modes the paper catalogs are not empirical questions about whether an output looks right. They are *structural* properties of the analysis, and structural properties can be checked rather than sampled.

Consider the three flagship examples through this lens.

**Reference-genome mixing is a typing problem.** GRCh37 and GRCh38 coordinates are different kinds of thing that happen to share a representation. If a genomic coordinate carries its assembly as part of its type, composing a GRCh37 output into a GRCh38 input is a type error caught at the seam between two tools — not a biologically meaningless result discovered three steps downstream. You do not test for the mix; you make it unrepresentable.

**All-normal-from-empty-input is a precondition problem.** A skill whose output is a pharmacogenomic report should be unable to produce one from an input that does not satisfy the contract "genotype data with at least one typed variant." The original ClawBio failure was a missing precondition in the skill's interface. A precondition is checkable at every invocation, by construction; it does not depend on an auditor thinking to supply an empty file.

**Out-of-distribution application is a scope-contract problem** — and here the paper is one short step from the answer it needs. The authors already propose that skills carry metadata "specifying which populations the underlying models were validated against," and that agents "flag or refuse to apply models outside their validated population scope." Promote that metadata from documentation to a typed contract, and "refuse to apply outside validated scope" stops being a behavior the agent must remember to perform and becomes a violation checked at the point of composition. The instinct is exactly right; formalizing it is what makes it hold when no experienced analyst is watching.

## Composition is where silent failure actually lives

The deepest version of this concerns how skills chain. The paper's agents compose skills into pipelines, and the most dangerous failures propagate *across* skills: the assembly mismatch between two tools, the coverage loss handed silently downstream. This is the classic seam problem — the place where two components with different assumptions meet is where meaning corrupts, and where a script that reshapes data preserves shape while guaranteeing nothing about sense.

A formal composition discipline addresses exactly this: the output contract of skill A must satisfy the input contract of skill B, checked at the join, not hoped for. Skill libraries already encapsulate "code, configuration, data references, input/output specifications, and test suites." Making the input/output specifications *typed contracts the composition engine checks* — rather than documentation the agent reads — converts a whole class of cross-skill silent failures from things you discover downstream into things that cannot be assembled in the first place.

## This is how the paper's own paradox resolves

The authors state the expertise paradox sharply: agentic genomics expands the capacity to *produce* analyses without expanding the capacity to *judge* them, and the judgment "is built over years and cannot be shortcut by AI." An expert recognizes when allele frequencies are implausible, when a filtering step was silently dropped, when a gene-disease association contradicts known biology. A novice does not, and no amount of democratized production creates that judgment.

Formal verification does not shortcut the expertise. It does something more useful: it lets the expertise be *encoded once, into the skill's contract, and enforced mechanically on every invocation* — so the check the 20-year analyst performs by intuition happens automatically, for the novice too, at the interface. You cannot give every user two decades of interpretive intuition. You can encode specific pieces of it into contracts the agent cannot violate. That is the only mechanism by which the paper's "produces but cannot judge" gap actually narrows rather than merely being acknowledged.

## The complementary layer

None of this replaces the tiered framework. Testing, benchmarking, external multi-site validation, and governance remain essential — most of what determines whether an analysis is trustworthy is empirical and irreducibly so. The point is narrower and, I think, actionable: a subset of the silent-failure modes the paper identifies as the central risk are structural, and structural failures are the ones verification can eliminate rather than merely make less probable.

The tiered framework tells you how hard to look. Formal methods can make some of the failures impossible to introduce. A mature agentic genomics stack will want both — the framework to calibrate scrutiny to consequence, and typed, checkable contracts at the skill interface and at every seam where skills compose, so that the failures which are structural stop being things an auditor has to catch and become things the system cannot express.

And "deterministic replay" is the signal worth heeding: when the strongest auditability guarantee a framework can offer is the ability to reproduce the execution, the field is reaching for capture where the problem is asking for proof.

---

*This is the problem we are building Eigenius to address: a verification layer for AI in science and engineering, where claims carry their derivations and are checkable rather than merely produced — and where the contracts between analytical steps are typed and enforced at the seam, not left to prose and glue code. The agentic genomics failures catalogued above are, in our terms, exactly the structural cases: not things you hope a test catches, but things the system can be made unable to express. Eigenius is open-source; if you work in this space and the argument here resonates, we would be glad to compare notes.*