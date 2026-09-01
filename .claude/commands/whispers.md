---
description: Read all whispers, draw connections to each other and to live projects, rewrite SYNTHESIS.md
argument-hint: (optional) a theme to focus the pass on
---

Run a synthesis pass over `80-WHISPERS/`. Read `80-WHISPERS/README.md` first — it carries the rules
this pass must follow, especially the anti-apophenia discipline.

Steps:
1. Read **both** `80-WHISPERS/INBOX-connal.md` and `80-WHISPERS/INBOX-austin.md`, plus every
   `w-*.md`. Assign `w-NNN` ids to any uncaptured lines — zero-padded, never reused, and a **single
   sequence shared across both inboxes**, never one per person (two sequences would collide the
   first time both reached the same number, and the collision would be silent).
2. Read the current `SYNTHESIS.md`, **including its rejected section** — a link that was thin at 3
   whispers can be strong at 15, and that upgrade is itself a finding worth naming.
3. Re-read the live projects listed in the README's project list before claiming any connection to
   one. Do not connect to a project from memory — the vault changes, and a connection to a stale
   version of a project is worse than no connection.
4. Rewrite `SYNTHESIS.md` in full. Bump `pass:` and set `whispers_read:`.

If `$ARGUMENTS` is given, bias the pass toward that theme, but still report anything strong that
falls outside it — a focused pass is not an excuse to drop a real finding.

Hold the line on quality:
- Every connection names a **specific consequence** — what would change if it's right. "These both
  relate to risk" is a word match, not a connection. Cut it.
- **The rejected section is mandatory.** A pass that rejects nothing did not discriminate, and its
  hits should be distrusted accordingly.
- Cap at ~5 live connections. A 6th only by displacing a weaker one.
- Prefer whisper↔whisper links over whisper→project. Two independent thoughts converging says
  something real about how they actually think; a whisper matching a project you already know about
  is the easiest and least informative link available.
- ! A connection BETWEEN Connal's inbox and Austin's is the most valuable kind this system can
  produce — it means two people arrived at the same thing separately, which is evidence no amount
  of my analysis can manufacture. Say so explicitly when one appears.
- A connection is a claim, so the mandate applies: give each one a falsifier.
- If the honest answer is "there is not enough here yet", say that and stop. An invented pattern is
  worse than an empty section — it will get built on.

Then tell Connal, in the chat, only the parts worth his attention: the strong connections and any
question you genuinely need him to answer. Follow the reply shape in `10-CTX/ops.md` — a few
sentences, plain, no tables. The detail stays in the file.
