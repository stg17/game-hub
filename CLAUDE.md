# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Game Hub** — a collection of small browser games, each self-contained, launched from a root menu page. No build step, no dependencies, no test suite, no package manager, no backend. Every game is plain HTML/CSS/JS meant to be opened straight from disk or a static file server.

## Structure

```
index.html         Game Hub — the menu/launcher page (root)
hub.css            Hub-only styling
games/
  dc-romp/         Side-scrolling platformer (see its own section below)
  tic-tac-toe/     Classic 2-player grid game with score tracking
  math-puzzles/    Three math puzzle types (Make 24 / Calcudoku / Number Pyramid), see below
  tetris/          Canvas Tetris with SRS rotation, hold, and a ghost piece
  2048/            DOM sliding-tile puzzle with a multi-step undo
```

Each subfolder under `games/` is a fully independent game: its own `index.html`, its own styles, its own scripts, nothing shared or imported across game folders. This is deliberate — games can use completely different code styles/conventions from each other, and none of them can break another by being edited.

## Running

Open root `index.html` directly in a browser (Chrome/Edge/Firefox) — everything works from `file://`, no server required. To serve instead: `python -m http.server` (or `npx serve`) from the repo root, then `http://localhost:8000`.

There is no lint or test command. Verification is manual: reload the page and play. Errors surface in the browser devtools console.

## Adding a new game

1. Create `games/<game-name>/` with its own `index.html`, styles, and scripts (vanilla HTML/CSS/JS, no build tooling — keep every game a drop-in `file://`-runnable folder).
2. Give it a `<a href="../../index.html" class="hub-link">← All Games</a>` back-link (see `games/tic-tac-toe/index.html` or `games/dc-romp/index.html` for the pattern and matching CSS).
3. Add a `.card` entry to the `.grid` in root `index.html` linking to `games/<game-name>/index.html`, following the existing card markup (thumb icon, title, short description, tags, Play button).
4. Update this file's **Games** section below with a short description.

## Games

### D.C. Romp (`games/dc-romp/`)

A cartoon-shaded side-scrolling platformer built on HTML5 Canvas 2D and vanilla JavaScript. The player is a small caricature character; `Game.LEVEL_COUNT` (currently 5) levels themed around a "Washington D.C. romp" (lawn → downtown → rooftop → golf course → Air Force One finale), unlocked in order. Menus work with both keyboard and mouse.

**No modules or bundler.** Every file is a classic `<script>` that attaches onto a single global `Game` namespace (`var Game = window.Game || {}` in `js/constants.js`). Consequences to respect:

- **Load order in `index.html` is the dependency graph.** `constants.js` must be first (it creates `Game` and is read by others at definition time — e.g. `Game.Camera` uses `Game.Canvas.WIDTH` at object-literal evaluation). Any new file must be added to `index.html` in the right position, after everything it references at load time.
- Modules that hold no per-instance state are IIFE singletons (`Game.Input`, `Game.Audio`, `Game.Collision`, `Game.UI`, `Game.Background`) or plain objects (`Game.Camera`, `Game.Utils`, `Game.Draw`).
- Entities are **factory functions, not classes** — `Game.Player(x, y)`, `Game.Enemy(opts)` return closures over a local object. No `new`, no `this` in entity methods (they close over the local variable instead).

**Global mutable state lives in `js/constants.js`** — `Game.state`, `Game.lives`, `Game.score`, `Game.levelIndex`, `Game.entities`, `Game.player`. Any module can read and write these; collision code, for instance, adds directly to `Game.score`.

**Frame flow**: `js/main.js` runs a fixed-timestep loop — accumulate real frame time, run `Game.update(1/60)` as many whole steps as fit (frame time clamped to 250 ms), then a single `Game.render(ctx)`. `Game.Input.endFrame()` is called after each update step, which is what makes `wasPressed`/`wasReleased` one-frame-only. Physics constants in `Game.Physics` are all per-second and multiplied by `dt` — never bake per-frame values into them.

**State machine**: `js/game.js` is the hub. `Game.state` is a string (`MENU`, `HOWTO`, `LEVEL_SELECT`, `PLAYING`, `PAUSED`, `LEVEL_COMPLETE`, `GAME_OVER`, `WIN`), and both `Game.update` and `Game.render` are `switch` statements over it. Adding a screen means adding a case to both plus a draw function in `js/ui.js`. Deliberate split: all input handling and state transitions live in `game.js`; `ui.js` only draws — UI functions take the values they render as arguments.

**Pausing mid-level**: `PAUSED` is itself a small menu (`Game.PauseOptions`: Resume / Restart Level / Quit to Menu), navigated with the same up/down-arrow + Enter or mouse-click pattern as the main menu, plus Escape/P as a one-key resume shortcut. Restart Level calls `Game.loadLevel(Game.levelIndex)` again with `Game.lives` reset to 3 and `Game.score` rolled back to `Game.levelStartScore` (snapshotted in `Game.loadLevel` the moment a level begins) — so a restart is a clean redo of just the current level, not a full new run.

**Mouse menu support**: every clickable UI element is drawn via `ui.js`'s `button()` helper, which both renders it and calls `registerHit(x, y, w, h, id)` to record its rect for that frame under a semantic `id` string (e.g. `'menu-0'`, `'level-3'`, `'pause-resume'`). `Game.render` calls `Game.UI.clearHits()` before drawing each frame, so `Game.UI.hitRegions` always reflects exactly what's on screen. `game.js`'s `getClickedId()` hit-tests the mouse position (via `Game.Input.getMousePos()`/`mouseClicked()`, wired up in `Game.Input.attachMouse(canvas)` from `main.js`) against those regions once per update, and each state's update function treats a matching `clickedId` exactly like the equivalent key press (`Enter` on a menu item, `Escape` on a back button, etc). Keyboard and mouse are two input paths into the same transition logic — never add a mouse-only or keyboard-only action.

**Physics/collision split** (least obvious convention): `player.update(dt)` sets **velocities only** and never moves the player. `Game.Collision.resolvePlayer` does the actual `x += vx * dt` / `y += vy * dt`, per-axis and in that order, so wall and floor contact resolve independently. It relies on `player.prevX`/`prevY` (snapshotted at the top of `player.update`) to distinguish landing on a platform top from hitting its underside. Enemies and projectiles, by contrast, move themselves in their own `update`. Moving platforms record `lastDx` and `lastDy` as actual travel **after** clamping at their endpoints. Before resolving contact, the resolver carries an existing grounded rider on both axes (horizontal carry is included in the wall check); jumping or knockback releases the rider. Side checks exclude contacts that began above/below the platform's previous position, and vertical checks use relative player/platform movement, so rising platforms cannot shove riders sideways and descending platforms keep riders grounded.

**Entity contract**: every entity exposes `update(dt)`, `draw(ctx, cam)`, and AABB fields `x, y, w, h`. `draw` converts world → screen with `x - cam.x`, `y - cam.y` (there is no canvas transform for the camera) and should early-return when off-screen. Removal is by flag, not by splicing during iteration: entities set `dead`/`collected`, and `updatePlaying` in `game.js` filters the arrays after all collision passes.

**Levels are data**: `js/levels/level{1..5}.js` are pure data objects registered into `Game.Levels`. A level object is `{ name, width, height, killY, theme, playerStart, platforms[], enemies[], collectibles[], goal }`; `Game.loadLevel` maps each array through the matching entity factory. Adding a level means: new data file, a `<script>` tag in `index.html`, an entry in `Game.LevelNames` (`constants.js`), and bumping `Game.LEVEL_COUNT` (also in `constants.js`) — `game.js` and `ui.js` both read that constant rather than hardcoding a level count, so nothing else needs to change. `theme` selects a parallax background from `js/background.js` (`lawn`/`downtown`/`rooftop`/`golf`/`sky`) — those are the only valid values, and an unknown theme silently falls back to `lawn`. Progress persists as a single `localStorage` key, `dcromp_unlocked` (an integer level number).

When authoring a level, keep single-jump platform height deltas comfortably under the player's max jump height (`JUMP_VELOCITY^2 / (2*GRAVITY)` in `constants.js`, ~144px at current values) — a delta within a few px of the max is a "can't actually reach it" bug in practice, not just in theory, since it demands frame-perfect input.

**Rendering style**: all art is procedural Canvas 2D — no image assets. The shared cartoon look comes from `Game.Draw` in `js/utils.js` (`cartoonBox`, `roundRectPath`, `groundShadow`, `highlight`), reused by platforms, UI buttons, speech bubbles, and characters. New visuals should compose those helpers rather than hand-rolling gradients and outlines.

Audio is likewise synthesized — `js/audio.js` builds every sound from WebAudio oscillators. The `AudioContext` can only be created after a user gesture, hence `Game.Audio.init()` called from menu confirm handlers. Every sound checks `Game.muted` itself. There is deliberately no speech synthesis: the Q catchphrase gag is a text-only speech bubble (`player.js`) — a generic browser TTS voice wouldn't sound like the character, and this project doesn't attempt real-voice impersonation, so the sound is skipped rather than faked.

Code conventions: ES5 throughout — `var`, `function`, no arrow functions, no `let`/`const`, no template literals, no optional chaining. Match it; there's no transpiler and the style is uniform across the folder.

### Tic Tac Toe (`games/tic-tac-toe/`)

Classic 2-player (local, same-screen) grid game — `index.html` + `style.css` + `script.js`, no shared state with other games. Board state, current player, and a persistent scoreboard (X wins / O wins / draws) all live in one IIFE in `script.js`; scores persist via `localStorage` key `ttt_scores_v1`. Winning line is drawn with an SVG `<line>` overlay positioned by cell index math (`cellCenter`) and animated in with `stroke-dashoffset`. The starting player alternates each round (`newRound`) so wins aren't biased toward whoever goes first. Code conventions: ES5 (`var`, `function`), same reasoning as D.C. Romp — no transpiler, keep it consistent within the file.

### Math Puzzles (`games/math-puzzles/`)

Three selectable math puzzle types, each with Easy/Medium/Hard difficulty and an Untimed/Timed toggle. Difficulty comes from puzzle-solving cleverness, not math content — nothing here goes past 7th-grade arithmetic (fractions, negatives, order of operations). DOM-driven, no canvas — a deliberate departure from D.C. Romp's rendering approach, since number entry and grid clicking are much more natural as real `<input>`/`<button>` elements than hand-rolled canvas hit-testing.

**Shared module interface**: `rational.js` and `storage.js` load first (dependency order in `index.html`), then each puzzle type's own file (`make24.js`, `calcudoku.js`, `pyramid.js`), then `app.js` last. Each puzzle file is an ES5 IIFE attaching itself to `window.MathPuzzles[type]` and exposing exactly 4 functions: `generate(difficulty)` → a puzzle-specific state object, `render(container, puzzleState, {onSolved})` → builds the DOM and wires interaction (calls `onSolved()` the instant it detects a win), `checkSolution(puzzleState)` → `{solved, ...}`, `getHint(puzzleState)` → mutates `puzzleState` and the already-rendered DOM in place. `app.js` never touches puzzle-specific internals — it only calls these 4 functions, so adding a 4th puzzle type means writing one new file matching this interface, a script tag, and a `.type-card` in `index.html`'s menu screen.

**State machine** (`app.js`, no game loop — pure event-driven, `setInterval` only for the visible Timed-mode readout): `menu → settings → playing → solved`, back-linked at every stage. Leaving `playing` without solving (Back to Menu / New Puzzle) calls `Storage.recordAbandon`, which resets that puzzle-type+difficulty's streak but never its lifetime solved count or best time.

**Stats persistence**: `localStorage` key `mathpuzzles_stats_v1`, shape `{make24: {easy, medium, hard}, calcudoku: {...}, pyramid: {...}}` where each leaf is `{solved, currentStreak, bestStreak, bestTimeMs}` — same try/catch + in-memory-fallback pattern as Tic Tac Toe's `ttt_scores_v1`. `bestTimeMs` only updates on Timed-mode solves.

**Make 24** (`make24.js`): click-to-combine tile UI (click tile, click op, click another tile → replaced by one result tile), not free-text parsing — avoids order-of-operations ambiguity entirely. All arithmetic is exact reduced-fraction math via `rational.js` (`Rational.add/sub/mul/div/equals`), never floats, so e.g. `8/(3-8/3)=24` checks out exactly. The solver (`combineAll` + recursive `countSolutions`/`findHint`) works by picking any pair from the current value list and recursing on the reduced list — every parenthesization shape falls out of that one loop, no shape enumeration needed. Difficulty is bucketed by solution count from rejection-sampled random draws (Easy ≥4 solutions, Medium 2-3, Hard exactly 1), with a guaranteed-solvable `[1,2,3,4]` fallback if 300 attempts never hit a bucket.

**Calcudoku** (`calcudoku.js`): standard KenKen — an N×N Latin square (`generateLatinSquare`, randomized backtracking) partitioned into cages (`generateCages`, randomized region-growing) with a target+op clue per cage (`computeCageClue`). The validator (`validatePlayerGrid`/`checkCageSatisfied`) checks row/col uniqueness and every cage's actual cells directly — it never compares to the stored solution grid, so any valid alternate completion is accepted in the rare non-unique case. `countSolutions` is a from-scratch backtracking solver (does not peek at the generator's solution) used only at generation time to verify uniqueness, early-exiting once 2 solutions are found; generation retries cage partitions (then whole new Latin squares) up to bounded counts, falling back to a non-unique puzzle rather than looping forever.

**Number Pyramid** (`pyramid.js`): each cell equals the sum of the two cells below it (`buildPyramidFromBottom`). Generation starts fully revealed and greedily un-reveals cells in random order, keeping each removal only if a constraint-propagation solver (`propagate` — repeatedly fills in any parent/child triple with exactly one unknown, to a fixed point) can still fully deduce the pyramid without it. Hard difficulty allows negative bottom-row values, since negative-number arithmetic is still 7th-grade-legal.

There's no test runner in this repo, but the generation algorithms are intricate enough that it's worth re-verifying invariants after changing one: valid Latin squares (each row/col has 1..N with no repeats), cages covering every cell exactly once, the pyramid's sum relation holding throughout, and each generator's own solution passing its own `checkSolution`. A throwaway Node script that `vm.runInContext`s the puzzle files with `window` stubbed to the sandbox object (since they're plain `<script>`s, not modules) is enough to check all of this without a browser.

### Tetris (`games/tetris/`)

Canvas-rendered falling blocks. `tetromino.js` (shape data) → `board.js` (grid) → `render.js` (drawing) → `audio.js` → `game.js` (state machine + loop), in that script order in `index.html`; `board.js` reads the `Tetromino` global, so it must load after it.

**Rotation is real SRS.** Each piece has four explicit rotation states as `[col, row]` offsets inside its own bounding box, and rotation is a table-driven wall kick: `Tetromino.kicks(type, from, to)` returns up to 5 candidate offsets, and `tryRotate` takes the first that passes `Board.valid`. The kick tables are the standard SRS tables **with their y components already negated** so they can be added to a piece's y directly — the shape offsets use row-increases-downward to match canvas coordinates, unlike the published tables. Don't "fix" the signs. O returns a single no-op kick.

**Nothing mutates a piece in place except `tryMove`.** The pattern everywhere else is build a candidate `{type, rot, x, y}`, test it with `Board.valid`, keep it only if it passes. `Board.valid` treats cells above the field (`y < 0`) as empty, which is what makes upward kicks near the ceiling and a partially-off-screen lock work; a piece locking with any cell above row 0 is what `lock()` reports as `toppedOut`.

**Line clears are a state, not an instant.** `lockPiece` scores and increments `lines` immediately, then parks in `state = 'CLEARING'` for `CLEAR_FLASH` seconds while the completed rows strobe; `finishClear` is what actually calls `Board.clearRows` and spawns the next piece. Because `frame()` clamps `dt` to 250ms, a timer like that needs several frames to elapse — a single large time step will not resolve it (relevant when driving the game from a test).

`Board.clearRows` relies on removing row *k* then unshifting a blank leaving every row below *k* at its old index, so it can walk an ascending list of row indices without adjusting them.

Lock delay is `LOCK_DELAY` with `MAX_LOCK_RESETS` refreshes per piece, so a piece can't be wiggled along the floor forever. Horizontal auto-repeat is our own DAS (`DAS_DELAY` then `DAS_REPEAT`) and OS key-repeat is explicitly ignored (`if (e.repeat) return`) — don't add a second repeat path. Held keys are cleared on `blur`, since keyups aren't delivered to an unfocused tab.

Only `tetris_best_v1` (an integer) persists; a game in progress is not saved. Gravity per level is the guideline formula in `dropInterval()`, floored so high levels stay playable.

### 2048 (`games/2048/`)

DOM tiles rather than canvas, because sliding/merging is much easier to animate with CSS transitions than to hand-draw. `board.js` is pure logic (no DOM, no timers) and `game.js` owns the elements, animation timing, undo and persistence.

**Tile ids are the whole design.** A board is a 4×4 matrix of `null` or `{id, value}`, and `Board.move` returns a *brand-new* board plus `moves` (per tile id, the cell it lands in), `merges`, `gained` and `moved`. Ids survive a move, which is what lets `game.js` animate by moving the *same* DOM node (kept in `nodes`, keyed by id) instead of redrawing the grid. `move()` never touches the board passed in, so the caller can keep the old one.

**Both halves of a merge slide onto the same cell** and get a `moves` entry each; the absorbed one is pushed to a lower `z-index` and removed by the single `setTimeout(..., MOVE_MS)` that also relabels the survivor and drops in the new tile. `MOVE_MS` must stay in sync with the `.tile` transform transition in `style.css`. The `pop`/`appear` keyframes drive `transform` themselves and outlast `MOVE_MS`, so `doMove` strips those classes and forces a reflow before setting any new position — otherwise a tile still mid-animation jumps instead of gliding. A `busy` flag blocks input during the slide.

Positions are set as `--r`/`--c` custom properties, never as pixel offsets: `.tile`'s `transform` derives its translate from `--tile` and `--gap`, which are declared once on `.board`. Change tile geometry there and everything (background cells, board size, tile positions, keyframes) follows.

**Undo** pushes a `{values, score, won, keepPlaying}` snapshot before every move that actually moves something, capped at `UNDO_LIMIT` (25). Restoring goes through `Board.fromValues`, which deliberately assigns **fresh ids** — an undone board is rebuilt from scratch in the DOM (`rebuild()`), so reusing old ids could collide with elements still on screen. Undo is also offered on the game-over overlay, so a fatal move is recoverable.

`2048_state_v1` persists the board, score, best, win flags **and the undo history**, so undo survives a reload. Anything malformed coming back out (`Board.isValidValues`) falls back to a fresh game rather than throwing.

Reaching 2048 sets `won` and shows the win overlay once; "Keep going" sets `keepPlaying` so it never reappears and only game-over is checked from then on.

### Verifying Tetris and 2048

Neither has a test runner, but both split their logic out of the DOM specifically so it can be checked headlessly, and the generation/rotation/merge rules are fiddly enough to be worth re-checking after a change. A throwaway Node script that `vm.runInContext`s the files with `window` stubbed to the sandbox object (they're plain `<script>`s, not modules) covers the pure logic: SRS states are 4 connected in-box cells, all 8 kick transitions exist, every piece rotates freely on an empty board, `dropDistance` lands exactly on the floor, rows clear with the rows below keeping their contents, each 7-bag window holds all seven types; and for 2048 that `[2,2,2,2]` left is `[4,4]` (each tile merging at most once), the near pair merges first, `moved` is false for a no-op, ids survive a slide, and — the strongest invariant — that over thousands of random moves the sum of all tiles always equals the sum of everything ever spawned, since merging preserves the total.

Both games' `game.js` can also be driven end-to-end against a small fake DOM (stub `getElementById`/`createElement`, a no-op canvas 2D context, `localStorage`, and a manually-pumped `requestAnimationFrame`/`setTimeout` clock). Two things to know when doing that: pin `Tetromino.bag` to a single piece type to make a line clear deterministic, since random Tetris play leaves unfillable holes and effectively never completes a row; and advance the clock in frame-sized steps, because of the `dt` clamp noted above.

## Notes

An OpenAI Codex config exists at `~/.codex/config.toml`. To pull anything importable from it (MCP servers, slash commands, subagents, skills, instructions) into Claude Code, reply `/import` to see a scan of what's available, then `/import --yes=<digest>` to apply. If `/import` isn't available on this surface, run `claude import` from a terminal.
