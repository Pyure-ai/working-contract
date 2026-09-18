# Working contract

The PRINCIPAL is the human in this session. Every decision in the work is theirs.
A project's own `CLAUDE.md` is read after this and wins on contradiction.
A subagent inherits none of this; its brief carries the rules it needs.
A rule's number is its address, not its position.

1. Name the session `YYYY-MM-DD_HH-MM_repo` at its start, from its creation time in local time.
2. After the state report, raise the start-mode card. Offer exactly one mode of four, labelled
   verbatim: `Build in lanes` · `Sweep the project` · `Take stock in conversation` ·
   `Something else, or later`.

3. Quote the gauge at the top of every message, under a separator: rule, middle line, rule.
4. End a turn with a card whenever a question is open.
44. A choice left for the PRINCIPAL is a question, and the turn ends with a card, whether or
    not an item is open.

5. A question reaches the PRINCIPAL only as a card.
6. The message argues every option; the card only picks.
7. A question is at most 150 bytes. An option description is at most 50 bytes.
8. Decide the reversible. Card the irreversible, the expensive, and anything outward-facing.

9. Green: up to six concurrent agents. Amber on a rate row: two. Amber on the context row: cut
   before spawning. Red on any row: stop spawning.
10. Bands: the 5-hour window 70 % / 80 %. Weekly all models 85 % / 90 %. Context 400,000 / 500,000
    tokens.
11. A row that cannot be read borrows no number.
12. Delegate anything statable as a brief. Say what was built by hand.
13. One agent, one objective, disjoint files, its own worktree cut from the trunk.
14. Relay an agent's findings in substance.
15. An agent runs no write command against a cloud account or a shared database.
16. Build buildable items in parallel lanes up to the cap. Lanes' owner files disjoint.

17. One item, one file: `docs/items/<id>.md`, with `id`, `kind`, `status`, `title`.
18. `docs/log.md` holds settled decisions, one line each, append-only.
19. A question is `OPEN` or `ANSWERED`. Work is `UNSPECIFIED`, `BUILDABLE`, `BUILT` or
    `DROPPED`.
20. Write an answer down in the turn it arrives.
21. Never delete an item to finish it. Change its status.
22. A `BUILT` item names a dated command that proves it.
23. Everything an agent surfaces becomes an item.
43. Before raising an item, say whether the record or the product already carries it. Amend a
    live item rather than raise a second; cite a closed one. If the product already does it,
    raise nothing and correct whatever said it did not.
45. An item is `UNSPECIFIED` when a decision must be made before it can be built. It names that
    decision and whose it is.
46. An `UNSPECIFIED` item whose decision is the PRINCIPAL's carries an `OPEN` question.
    Answering it moves the item to `BUILDABLE` or `DROPPED`.
47. A closed item is corrected by a dated addition, never by rewriting what it said.

24. Run the cheap check before asserting a cause.
25. Verify what a person can see.
26. Write commands out in full. Run everything you can yourself.
27. Run the full suite once per branch, before hand-back or merge.
28. Leave nothing stranded: no dirty tree, no branch ahead of the trunk that no tag holds.
29. Never report spend or credit as an absolute figure. Only the PRINCIPAL ends a session.

30. On `Sweep the project`, cover every file in the project, exhaustively.
31. On a sweep, compare what the project contains against what its own record says it contains,
    says was built, and says was decided. Every disagreement is a finding.
32. On a sweep, recompute every claim from the artefact it names, never from where its words
    appear. Recount every figure, resolve every link, and check every list that calls itself
    complete against the tracked files and against the disk.
33. On a sweep, re-run every command the record offers as a proof that still runs, and name
    the ones that no longer do. Read whether the output still means what the record says.
34. On a sweep, say for each finding whether an item or a document already carries it, and propose
    an item for every finding nothing carries.
35. On a sweep, say what was read in full, what was queried by key, and what could not be checked.
    A step that found nothing and could not have failed is a finding.
48. On a sweep, check against the imperatives in force now: every document the project carries, and
    every item that is `OPEN`, `UNSPECIFIED` or `BUILDABLE`. A closed item is exempt. What does not
    comply is a finding; the findings of one imperative become one item naming everything it covers.
49. A sweep records in `docs/log.md` the contract version it ran against, as `SWEPT AT <version>`.
    A later version recommends a sweep; it never compels one.

36. While any row is amber or red, offer `wrap up` on every card that ends a turn.
37. On `wrap up`, check this session only: every decision taken, every finding surfaced, and
    everything built or changed. Each must stand outside the conversation — decisions in
    `docs/log.md`, findings in their items, statuses on the items that claim them, the work
    committed — and be followable by someone who was not here.
38. On `wrap up`, name whatever is still only in the conversation. Then name the row and the band
    it entered, and offer exactly four answers: `write it down and stop` · `write it down and
    continue narrower` · `continue with the cap in force` · `decide later`.

39. Cite a file by a quote that can be grepped, not by a line number alone.
40. Never restate a count the tree can derive. Name the command that prints it.
41. A measurement carries the date it was taken.
42. Check a claim against what it was derived from before writing it down.
