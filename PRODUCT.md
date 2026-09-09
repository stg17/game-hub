# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One primary visitor: someone the author hands the project to — a person opening the hub cold, on a desktop browser, to see what was built and to actually play. They arrive without instructions, spend a few minutes, and either bounce off the menu or fall into a game. A secondary, recurring visitor is the author, who returns to add the next game.

## Product Purpose

Game Hub is a collection of small, self-contained browser games launched from a single menu page. It exists as a portfolio piece: proof of what got built in Claude Code practice, and something a stranger can play immediately. Success is a visitor who understands the collection in one viewport, picks a game without being told how, and finishes at least one round.

## Positioning

Every game is genuinely finished, not a demo stub: real SRS wall kicks in Tetris, exact reduced-fraction arithmetic in Make 24, a uniqueness-verified Calcudoku generator, a 25-step undo in 2048 that survives a reload, five hand-authored platformer levels. The collection's claim is depth per game, in a form that runs from `file://` with zero dependencies, no build step, and no backend.

## Operating Context

Opened as a static site — either straight off disk (`file://`) or from `python -m http.server` at the repo root. Desktop browser with a keyboard is the primary scene; 2048 also handles touch. A session is short: open the hub, pick one game, play a few rounds, maybe go back for another. The hub back-link (`← All Games`) is the only navigation between surfaces.

## Capabilities and Constraints

- Vanilla HTML/CSS/JS only. No build step, no bundler, no package manager, no dependencies, no backend, no test runner.
- Must run correctly from `file://`, which rules out ES modules, fetch of local files, and anything needing an origin.
- Each folder under `games/` is fully independent — nothing is shared or imported across game folders, deliberately, so no game can break another. Any shared visual system is therefore duplicated per folder, not linked.
- D.C. Romp is a single HTML5 Canvas: its menus, HUD, pause screens, and all art are drawn procedurally in JS (`js/ui.js`, `js/utils.js`). It has no CSS surfaces to restyle. Code there is strict ES5 (`var`, `function`, no arrows/`let`/`const`/template literals).
- Tetris and 2048 render their play areas to canvas and DOM respectively; both split pure logic out of the DOM.
- Persistence is `localStorage` only, one key per game: `dcromp_unlocked`, `ttt_scores_v1`, `mathpuzzles_stats_v1`, `tetris_best_v1`, `2048_state_v1`.
- Verification is manual — reload and play. There is no lint or test command.
- Seven games ship today: D.C. Romp (platformer, 5 levels), Tic Tac Toe (2-player, scoreboard), Math Puzzles (Make 24 / Calcudoku / Number Pyramid, 3 difficulties, timed toggle), Tetris (SRS, hold, ghost), 2048 (undo), Terms & Conditions (reaction, overriding clauses), Ink by Numbers (nonogram, 40 hand-drawn plates).
- **The collection is open-ended and expected to grow.** Seven is where it stands, not where it stops. Any visual system, layout, or navigation must absorb an eighth, twentieth or fiftieth game without being redesigned, and adding one must stay a small, repeatable operation.

## Brand Commitments

None binding. The user confirmed the entire current appearance is replaceable — names, copy, colors, type, layout — provided every game still plays identically. Redesign scope for D.C. Romp is its canvas menus, HUD, and page frame; the in-level world art (characters, platforms, parallax backgrounds) stays as built.

## Evidence on Hand

Real, working artifacts only: seven playable games in this repo, plus `CLAUDE.md`, which documents each game's architecture in detail. There are no users, no metrics, no testimonials, no press, no download counts, and no deployment. Future work must not invent any.

## Product Principles

1. **Playable beats described.** The collection's value is that the games actually work; anything on screen should get a visitor into one faster.
2. **Independence is a feature.** Per-folder self-containment is deliberate and survives any redesign, even at the cost of duplicated CSS.
3. **Zero-dependency, `file://`-runnable.** Every addition has to survive being opened as a local file with no server.
4. **Depth per game over count of games.** The next game is finished properly or not added — but the system always has room for the next one, and shows it.
5. **Behavior is frozen; appearance is not.** Rules, controls, scoring, and storage keys stay exactly as they are through any visual work.

## Accessibility & Inclusion

No product-specific standard was established. Keyboard operation is already load-bearing (all of Tetris, D.C. Romp, and 2048 are keyboard-first, and D.C. Romp deliberately mirrors every mouse action with a key), so keyboard parity is a de facto constraint rather than an aspiration.
