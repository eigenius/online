---
title: "Verification Should Be a Spell-Checker"
subtitle: "A response to Science (16 July 2026): H. Holden Thorp, \"AI in scientific publishing: Slower, worse, and more expensive,\" and James Evans, Casey Petroff & Gary King, \"Advancing science by designing for surprise.\""
description: >-
  Peer review spends its scarcest resource — expert attention — on the one class
  of error that needs none of it: checking that citations resolve and statistics
  match. Those checks should feel like a spell-checker, absent rather than
  adjudicated — which means changing the artifact so claims carry their own
  verifiable derivations.
pubDate: 2026-07-23
tags: ["peer-review", "scientific-publishing", "formal-verification", "commentary"]
image: ../../assets/articles/verification-should-be-a-spell-checker.png
imageAlt: >-
  A dark studio render: small research papers, each carrying a scientific figure
  — a line chart, a scatter plot, a molecular model — advance through a machined
  lattice, tethered by pale-blue filaments to data-nodes below. One paper rises
  on a column of light to a spotlit position above, its plot marked by a single
  amber outlier that breaks the pattern.
---


Last week, two pieces ran in the same issue of *Science*. Neither cites the other, yet each holds one half of a diagnosis that only makes sense whole.

[Thorp describes a scissors problem](https://www.science.org/doi/10.1126/science.aek5570). Generating a paper has become cheap and effectively unbounded; checking one has stayed expensive and human-bounded. Submissions climb, error rates climb with them, and the response has been to add human oversight—including the human effort required to interpret the output of every automated tool brought in to reduce human effort. The comparison to Taylorism lands. So does the warning about the people absorbing the load.

[Evans, Petroff, and King describe something adjacent](https://www.science.org/doi/10.1126/science.aej4257) and, in its way, worse. Even when review does reach genuine judgment, the criterion is wrong. Papers are written as cautious confirmations, framed for the subfield whose intuitions already agree, deferring to established paradigms because that is what gets through. Their phrase for it is exact: this is "performance art designed for reviewers rather than a search for the most informative surprise."

Put the two together and the failure has two layers. Expert attention is being consumed by the layer that requires no expertise. And what survives to the judgment layer is calibrated toward confirmation rather than information.

### **What is Actually Consuming Reviewers**

Consider what a reviewer spends time on when a manuscript arrives. Some of it is judgment: *Is this novel? Is the design sound? Do the conclusions follow? Does the work advance the field?* Some of it is bookkeeping: *Do these references exist? Do they say what they are cited as saying? Do the numbers in the abstract match the numbers in the tables? Is this the analysis that was preregistered or a different one?*

The second category is what has exploded. Hallucinated citations, fabricated statistics, and silently substituted analyses are bookkeeping failures, and they are the ones AI-assisted authorship produces at scale. They are also, without exception, tasks that require no scientific expertise. A citation either resolves to a real work that supports the claim, or it does not. That is not a matter of taste, judgment, or domain insight. It is a check.

So, the field is spending its scarcest resource—the attention of qualified experts—on the one class of error that needs none of it. The cost is not only time. A reviewer who has burned their budget verifying that thirty references exist has less left for the part nobody else can do. The crowding-out does not just make review slower. It makes it worse, and it makes it worse in precisely the dimension Evans and colleagues care about: the capacity to recognize and reward a finding that should change what the field believes.

### **Verification Should Aspire to Irrelevance**

Here is the standard I would propose for the bookkeeping layer: **it should feel like a spell-checker.**

Nobody convenes three experts to adjudicate whether a word is misspelled. Nobody argues about whether spelling matters—it does. The check simply happens, continuously and invisibly, at the moment of writing. By the time a human reads the text, that entire class of error is not caught, not flagged, not adjudicated. It is absent. The spell-checker did not make spelling unimportant. It made spelling *not a use of human attention*.

The reason reference-checking is not yet a spell-checker has nothing to do with the difficulty of the task and everything to do with the artifact. Prose does not carry its reasoning in a form where the check is decidable. A manuscript asserts that something follows; the reviewer reconstructs, from narrative, whether it does. Every automated tool built on top of prose therefore produces flags rather than answers—which is exactly Thorp's complaint that each automated report generates further human work.

You cannot detect your way out of an artifact that does not carry its reasoning. But you can change the artifact.

If a claim carried its citation as a resolved link rather than a string in a bibliography, a hallucinated reference would not be something a tool catches. It would be something the manuscript cannot express. If a reported statistic carried its derivation from deposited data, recomputation would not be a task assigned to a reviewer. It would be a property established before submission.

### **The Anti-Taylorist Option**

Thorp's closing concern is welfare and agency—people pushed to do too much in the name of production. That concern argues for this position rather than against it.

Layering more detection onto prose is Taylorism. It intensifies monitoring, multiplies reports, and grinds the same humans harder while telling them the tooling is helping. Making a class of error structurally impossible is the opposite move: it removes the work rather than surveilling the people doing it.

The AI enthusiasts Thorp criticizes are not wrong that something here should be automated. They are wrong about *what*. Automating detection on top of prose adds burden. Changing the substrate so that verification is structural is the automation that would actually relieve it—and it is harder, slower, and considerably less marketable than shipping another slop detector.

### **What the Freed Attention is For**

This is where the second piece matters, because clearing the bookkeeping layer is not an end in itself.

Evans, Petroff, and King argue that the value a paper adds depends not only on what it shows, but on whose worldview it updates and by how much. They argue that only surprise carries information, and that the incentives of modern science systematically reward the uninformative. They want framing, audience selection, and the deliberate construction of a prediction gap brought inside the theory of inference rather than left to intuition and showmanship.

Whatever one makes of that program, it requires something scarce: reviewers with enough attention left to evaluate an unfamiliar claim on its evidence rather than on its conformity. Recognizing a surprising result as sound is harder than recognizing a familiar one as competent. It demands more of the reviewer, not less. A review system whose expert capacity is being drained by citation-checking will default to what is cheap to assess, and what is cheap to assess is deference.

The bookkeeping burden and the confirmation bias are not separate pathologies. The first feeds the second.

### **Surprise Needs a Substrate, Too**

The same argument cuts back the other way, and this is the part I would press.

Evans and colleagues anticipate the obvious objection—that designing for surprise invites manufactured novelty, findings selected because they startle someone and audiences selected because they are easy to startle. Their answer is a calibration norm: the intensity of surprise framing must track the strength and breadth of the evidence, with consilience across independent methods, datasets, and mechanisms as the standard of proof.

That norm is exactly right and, in a prose literature, unenforceable.

You cannot check that a paper's rhetorical audacity is proportionate to its evidential support when both the audacity and the support are narrative. Consilience across independent lines of evidence is a claim about the structure of the evidence—which lines are genuinely independent, which converge, what each actually establishes. Asserting consilience in a discussion section is not the same as having it, and prose cannot tell the two apart. Their safeguard against a hype engine requires evidence chains that can be inspected rather than described.

The same applies to their proposal for measuring what a field expects. They suggest that large language models trained on a field's literature already approximate a community's priors and could be calibrated into a formal instrument. But a model that absorbs a field's narrative cannot distinguish *the field has established this* from *the field has repeatedly asserted this*. It inherits every unchecked claim in the corpus and returns it as consensus. Measuring a prediction gap requires knowing what a field actually knows—which is a question about the epistemic status of its claims, not their frequency.

### **The Two Halves**

To be clear about scope: none of this automates scientific judgment, and it should not try. Whether a paper is interesting, whether its design supports its claim, whether the field is better for it—that stays human, and that is the point of insisting the bookkeeping go elsewhere.

Thorp is right that the scientific record needs rigorous human curation. Evans, Petroff, and King are right that this curation is currently rewarding the wrong thing. Both problems have the same root: a literature of assertions, where everything from a fabricated citation to a claim of consilience arrives as narrative and has to be reconstructed by a human before it can be judged.

Make the checkable layer checkable, and two things follow. Expert attention returns to the questions that need it. And the calibration norm that would keep designing-for-surprise honest becomes something you can actually enforce, rather than a discipline the field must hope its authors observe.

Everything below judgment should feel like a spell-checker: real, necessary, and beneath notice.

*This is the exact problem we are building **Eigenius** to address: an open-source verification layer for AI in science and engineering. We are building a substrate where claims carry their derivations and are mechanically checkable rather than asserted in prose and reconstructed by hand—and where the epistemic status of a claim, whether declared, observed, derived, or verified, is part of the record rather than a matter of inference from the writing.*