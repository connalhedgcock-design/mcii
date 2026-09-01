---
description: Add a task to the right person's queue with a priority, or show the current board
argument-hint: <the task, plainly> | "board" to just show what's live
---

Read `90-TASKS/README.md` for the priority bands and lane rules before doing anything here.

**If `$ARGUMENTS` is "board" or empty:** show the live board from `90-TASKS/BOARD.md` — but only
P0/P1/P2 plus the single top P3, and say it in a few plain sentences rather than pasting the file.
The board is a reference document; the chat answer is "here's what matters now".

**Otherwise**, add `$ARGUMENTS` as a task:
1. Assign the next free `T-NNN`.
2. Assign a priority by walking the decision tree in the README **in order, stopping at the first
   yes**. Do not skip to a band because it feels important — that tree exists to stop priority
   inflation.
3. Assign a lane from D-89 (`10-CTX/ops.md`): `@connal` for scanner effectiveness / what the data
   means / analysis algorithms, `@austin` for the app, its bugs, rooms, features and UI. Use
   `@both` when it genuinely straddles, and `@unclear` when you cannot tell — **never guess an
   owner**, since guessing wrong wastes the wrong person's evening.
4. Write a `why:` that states the **consequence**, not a restatement of the task.
5. Append to `90-TASKS/connal.md` or `90-TASKS/austin.md` — the owner's own file, never a shared
   one, so two people adding tasks can never conflict in git.
6. Regenerate `90-TASKS/BOARD.md` from both personal files.

Checks worth making before you write it down:
- If it's really a **decision** rather than work ("decide whether X"), it belongs in
  `50-LOG/decisions.md` as a D-NN. Say so and put a pointer in the task file instead.
- If it duplicates an existing task, update that one rather than adding a second.
- If it came from a whisper, link both ways.

Reply in one or two plain sentences: what it is, who owns it, what band, and — only if it's P0 or
P1 — why it's that urgent. Never paste the whole board back.
