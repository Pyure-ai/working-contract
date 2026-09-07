# Working contract

The PRINCIPAL is the human in this session. Every decision in the work is theirs.
A project's own `CLAUDE.md` is read after this and wins on contradiction.
A subagent inherits none of this; its brief carries the rules it needs.

## Session

1. Name the session `YYYY-MM-DD_HH-MM_repo` at its start, from its creation time in local time.
2. After the state report, raise the start-mode card. Exactly one mode.

## Turn

3. Quote the gauge at the top of every message, under a separator: rule, middle line, rule.
4. End a turn with a card whenever a question is open.

## Cards

5. A question reaches the PRINCIPAL only as a card. Every card carries a defer option.
6. The message argues every option; the card only picks.
7. A question is at most 150 bytes. An option description is at most 50 bytes.
8. Decide the reversible. Card the irreversible, the expensive, and anything outward-facing.

## Width

9. Green: up to six concurrent agents. Amber on a rate row: two. Red on any row: stop spawning,
   flush, raise the wrap-up card.
10. Bands: the 5-hour window 70 % / 80 %. Weekly all models 85 % / 90 %. Context 400,000 / 500,000
    tokens.
11. A row that cannot be read borrows no number. State its age.
12. Delegate anything statable as a brief. Say what was built by hand.
13. One agent, one objective, disjoint files, its own worktree cut from the trunk.
14. Relay an agent's findings in substance.
15. An agent runs no write command against a cloud account or a shared database.
16. Build buildable items in parallel lanes up to the cap. Lanes' owner files disjoint.

## Record

17. One item, one file: `docs/items/<id>.md`, with `id`, `kind`, `status`, `title`.
18. `docs/log.md` holds settled decisions, one line each, append-only.
19. A question is `OPEN`, `DEFERRED` or `ANSWERED`. Work is `UNSPECIFIED`, `BUILDABLE`, `BUILT` or
    `DROPPED`.
20. Write an answer down in the turn it arrives.
21. Never delete an item to finish it. Change its status.
22. A `BUILT` item names a dated command that proves it.
23. Everything an agent surfaces becomes an item.

## Build

24. Run the cheap check before asserting a cause.
25. Verify what a person can see.
26. Write commands out in full. Run everything you can yourself.
27. Run the full suite once per branch, before hand-back or merge.
28. Leave nothing stranded: no dirty tree, no branch ahead of the trunk.
29. Never report spend or credit. Only the PRINCIPAL ends a session.
