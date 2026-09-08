---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["hub.css","games/tic-tac-toe/index.html","games/2048/index.html","games/tetris/index.html","games/math-puzzles/index.html","games/dc-romp/index.html"]
---

Scope: the whole product — root launcher (`index.html` + `hub.css`) and all five game surfaces. Visitor mode: Experience at the hub (the games are the artifact and they lead); Operate inside each game (the playfield must never be harder to read than it is today).

Audience: someone handed this cold on a desktop browser, keyboard available, a few minutes to spend. Job: understand the collection in one viewport, pick a game without instruction, finish a round. Constraints: vanilla HTML/CSS/JS, no build step, no dependencies, must run from `file://` (so fonts ship as base64 data URIs — Chrome blocks `@font-face` file fetches), per-folder independence is mandatory so the system is duplicated into each game folder rather than linked, and all rules, controls, scoring, and `localStorage` keys are frozen.

Hard requirement from the user: the collection is open-ended. The system must absorb game six, ten, twenty without redesign.

Memorable moment: the set laid out to choose from — five printed boards on the table, the sixth space open and printed with its number, waiting.

Unresolved: none blocking. D.C. Romp's in-level world art (characters, platforms, parallax) stays as built by the user's scope answer; only its canvas menus, HUD, pause, and page frame are rebuilt.

## Direction contract

THESIS: Game Hub is a boxed compendium of games — the set laid out on the table to choose from, each game a separately printed board with its own die-cut components. It refuses the arrangement this category always ships: a dark gradient page of same-size rounded cards with emoji thumbnails and a coloured Play button, which is also exactly what this project had. The set is the artifact; the interface is the table it sits on.

OWN-WORLD: A bottle-green printed ground (#123b2c) with chipboard tray browns; each game printed in its own saturated field — cobalt, ochre, teal, plum, sky — with warm printed black (#171410) keylines and pulpboard (#e6dcc4) reserved for rules leaflets and small labels, never as the page ground. One reserved action colour, chrome red (#cf3a22), spent only on the primary affordance and live state. Type is two slabs: Bevan for lid and board titles, Zilla Slab 400/700 for everything else, base64-embedded. Components are die-cut plates with a real cut edge, printers' registration marks, and set numbering. Absolutely no gradients, no glass, no blur, no soft-shadow cards, no emoji: depth comes only from flat unmixed colour overlapping flat unmixed colour, the way printed board stock actually builds it.

STORY: The visitor sees a set worth opening, reads five printed boards and their live records in one look, understands each game from its own board before clicking, and takes one. Leaving a game returns them to the table with that board's record updated.

FIRST VIEWPORT: Full-bleed bottle-green table. Top-left, the lid propped at the edge of frame carrying the wordmark in Bevan and the set line "FIVE GAMES · ONE BOX"; no eyebrow above it. The rest of the viewport is the set laid out: five printed boards at differing sizes on one composed plan — Tetris's well and 2048's tray large, Tic Tac Toe small, Math Puzzles and D.C. Romp mid — each board printed in its own field with its title, its real components drawn (pieces, tiles, marks, cages, platform run), a printed record strip reading its actual stored state, and edge marks with its set number. The sixth space is an open die-cut outline printed "NO. 06", the invitation, not a disabled card. The primary action is the board itself; the whole plate is the target.

FORM: The Compendium Box — candidate 1 of the second grounded list, taken by the user over the assigned roll (Operator's Service Manual, candidate 4). Seed key bee43493, re-roll 1. Raised by the hands on the table: from Saturday Title Card, unmixed printed colour at full strength and transitions that are announced rather than faded; from Drum Machine Step Row, silkscreen labels on everything and the only luminous elements are small indicators, with the empty slot composed as invitation; from Brodovitch Bazaar Spread, composed density — boards at deliberately different scales on one plan, a dense board answered by quiet table, never a uniform grid; from Łowicz Layered Papercut, depth from overlap of flat unmixed colour only, never from tone; from Hand Processed Film Bloom, an edge rail on every surface carrying set number, game number, and registration marks so any single screenshot says which piece of which set it is; from Fluid Ink Basin, every control labelled by what it physically does.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
