---
title: "Auditable Agents, Adversarial Worlds"
description: "This issue spans agentic research systems for brain and clinical science, safety benchmarks that probe where AI breaks, and fresh formal-methods foundations for probabilistic and distributed programs."
issue: 2
pubDate: 2026-07-18
tags: ["verified-science", "ai-life-sciences", "formal-methods"]
draft: true
---

We lead with agentic pipelines built for auditable scientific discovery, then turn to benchmarks and attacks that deliberately expose where AI models fail. We close with two formal-methods advances—one for probabilistic hyperproperties, one for mechanised choreographic programming. The throughline: making AI reasoning and behavior traceable, testable, and provably correct.

## Agentic Science, Audited

### BrainPilot: Automating Brain Discovery with Agentic Research
BrainPilot is an open-source multi-agent system aimed at the brain science pipeline—literature review, analysis, and interpretation—rather than a single-step QA tool. It uses a PI agent to coordinate specialist agents grounded in a curated knowledge base (7,233 indexed items) and a skill library (72 reusable methodology units across seven research domains), while a Graph of Trace logs subgoals, tool calls, evidence, and claims to make workflows auditable, and a dedicated Auditor agent checks for fabricated claims. Evaluated on three tasks from Agents' Last Exam plus a new benchmark (BrainPilotBench-v0) and case studies, the system matches state-of-the-art agent frameworks in performance using an open-source backbone model, at lower cost.
[Read the source →](http://arxiv.org/abs/2607.15079v1)

### Self-Evolving Human-Centered Framework for Explainable Depression Symptom Annotation
This paper introduces an expert-in-the-loop annotation pipeline for depression datasets that couples LLM-assisted labeling with structured DSM-5-TR criterion analysis, aiming to fix the common problem of MDD labels lacking traceable clinical justification. The system works in three stages—evidence selection, criterion-level analysis, and case-level synthesis—and exports not just labels but supporting evidence, reasoning traces, and edit histories for auditability. A dual-memory design (Example Memory plus Reflection Memory) is proposed to let the system absorb expert corrections and refine future annotations without retraining, though the authors explicitly leave multi-cycle evaluation of this mechanism to future work. A small pilot with expert-reviewed samples reportedly improved annotation consistency and explainability while cutting manual revision effort, though no quantitative results are given here.
[Read the source →](http://arxiv.org/abs/2607.15202v1)


## Probing Failure Modes

### BadWAM: When World-Action Models Dream Right but Act Wrong
BadWAM exposes a critical blind spot in world-action models (WAMs), which pair action generation with future-state prediction under the assumption that imagined futures can be used to sanity-check executed actions. The paper shows this coupling can be adversarially decoupled: small visual perturbations can drive a WAM toward task-failing actions (action-only attack), or—more concerning—drive harmful action shifts while keeping the predicted future close to the clean, unperturbed imagination (imagination-preserving attack), making the corruption hard to detect via the model's own forecasts. Across WAM variants under closed-loop execution, the action-only attack alone collapses task success from 96.5% to 43.1%, and the imagination-preserving variant demonstrates that moderate regularization toward future consistency can preserve strong attack potency while minimizing imagination drift, undermining the premise that imagined futures reliably signal safe behavior.
[Read the source →](http://arxiv.org/abs/2607.15207v1)

### MedFailBench: A Clinician-Built Open-Source Benchmark for Medical AI Safety Boundary Inspection
MedFailBench shifts medical AI evaluation from correctness-checking to failure-mode diagnosis, asking which specific safety gate broke rather than whether the model got the answer right. The v0.2.1 release offers 44 clinician-reviewed synthetic cases annotated with a 1–5 severity scale and a taxonomy of six failure types—missed urgent escalation, unsafe remote dosing, unsafe discharge reassurance, evidence fabrication, unsafe protocol execution, and source support gaps—alongside a clinical severity rubric, a live HuggingFace leaderboard preview, and an automated pipeline for archiving model-response screening runs. Notably, the benchmark contains no real patient data, no clinical validation claims, and no model rankings; it is licensed under Apache-2.0/CC-BY-4.0 with a Zenodo DOI, positioning it as an early, openly extensible resource for probing safety-boundary failures rather than a validated clinical evaluation tool.
[Read the source →](http://arxiv.org/abs/2607.15166v1)


## Formal Foundations

### Disintegration Temporal Logic for Probabilistic Hyperproperties
DTL introduces measure disintegration—conditioning probabilities on finite or infinite event sequences within an execution—as the foundation for a new probabilistic temporal logic capable of expressing hyperproperties like probabilistic non-interference and perfect indistinguishability, which existing probabilistic logics cannot cleanly capture. This framework naturally models interacting stochastic systems, where one component's complete execution induces conditional distributions over another, with applications spanning stochastic-environment interactions, MDP distributional properties, and probabilistic automata on infinite words. Although model checking full DTL against Markov chains is undecidable, the authors identify two decidable fragments: a linear fragment with a polynomial-time model-checking algorithm based on linear algebra, covering properties such as perfect indistinguishability and history-based non-interference, and a qualitative fragment handled via an automata-theoretic procedure that extends the standard HyperCTL* algorithm with reasoning over bottom strongly connected components.
[Read the source →](http://arxiv.org/abs/2607.15223v1)

### Mech: Mechanised Choreographic Programming
Mech is a Lean 4 mechanisation of choreographic programming that, unlike prior formalizations restricted to narrow fragments, handles the full trio of general branching with knowledge-of-choice, general recursion, and nondeterministic choice simultaneously. The authors identify a genuine gap in existing literature semantics—it mishandles how nondeterministic choice interacts with concurrency—and fix this with new semantics aligning choreography executions to projected endpoint behavior, supported by newly derived algebraic laws for choreography operators and endpoint projection. On this basis they mechanically prove soundness and completeness of endpoint projection and derive communication safety and deadlock-freedom for the resulting distributed programs, making this the most extensive machine-checked theory of choreographic programming so far.
[Read the source →](http://arxiv.org/abs/2607.15174v1)

