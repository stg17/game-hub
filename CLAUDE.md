# CLAUDE.md

@AGENTS.md

Project architecture and game implementation notes for Game Hub. Shared workflow, cooperation, and Git rules live in `AGENTS.md`; update those rules there. Claude Code loads them through the import above. Other assistants should read the relevant project sections below.

## Project

**Game Hub** — a collection of small browser games, each self-contained, launched from a root menu page. No build step, no dependencies, no test suite, no package manager, no backend. Every game is plain HTML/CSS/JS meant to be opened straight from disk or a static file server.

## Structure

```
index.html         Game Hub — the menu/launcher page (root)
hub.css            Hub-only styling
hub.js             Hub record strips, set numbering, and the opening animation
type.css           The two typefaces as base64 data URIs; copied into each game folder
games/
  dc-romp/         Side-scrolling platformer (see its own section below)
  tic-tac-toe/     Classic 2-player grid game with score tracking
  math-puzzles/    Three math puzzle types (Make 24 / Calcudoku / Number Pyramid), see below
  tetris/          Canvas Tetris with SRS rotation, hold, and a ghost piece
  2048/            DOM sliding-tile puzzle with a multi-step undo
  terms-and-conditions/  Reaction game about small print that overrides a big instruction
  nonogram/        Reconstruct a printed picture from run-length clues
```

Each subfolder under `games/` is a fully independent game: its own `index.html`, its own styles, its own scripts, nothing shared or imported across game folders. This is deliberate — games can use completely different code styles/conventions from each other, and none of them can break another by being edited.

## Running

Open root `index.html` directly in a browser (Chrome/Edge/Firefox) — everything works from `file://`, no server required. To serve instead: `python -m http.server` (or `npx serve`) from the repo root, then `http://localhost:8000`.

There is no lint or test command. Verification is manual: reload the page and play. Errors surface in the browser devtools console.

## Adding a new game

The hub is a boxed compendium of printed games — see `DESIGN.md` for the design
system and `PRODUCT.md` for what the collection is. **The set is open-ended.**
Board widths, set numbering and the empty slot all derive themselves from how
many boards are on the table, so adding one is additive: nothing gets
renumbered and no layout gets re-tuned.

1. Create `games/<game-name>/` with its own `index.html`, styles, and scripts (vanilla HTML/CSS/JS, no build tooling — keep every game a drop-in `file://`-runnable folder).
2. **Copy `type.css` from the repo root into the folder** and link it before the game's own stylesheet. It carries the two typefaces as base64 data URIs because Chrome refuses to fetch `@font-face` files over `file://`. It is duplicated into every game folder on purpose; do not link the root copy across folders.
3. Give it the back-to-the-box tab: `<a href="../../index.html" class="hub-link">` with the inline chevron SVG and the label "Back to the box" (copy from `games/terms-and-conditions/index.html` or `games/tic-tac-toe/index.html`, along with the matching `.hub-link` CSS).
4. Add an `<a class="board board--<slug>">` to the `.tray` in root `index.html`, **immediately before `<div class="slot">`**, copying the No. 03 block's structure exactly: `.board__field` wrapping an inline `.board__art` SVG plus `.board__no`, then `.board__foot` with `.board__title` / `.board__rule` / `.board__spec` / `.board__record[data-record="<key>"]`. Type a literal `No. NN` in the stamp as the no-JS fallback; `hub.js` overwrites it from position.
5. Draw the board art in the house hand: a `0 0 250 250` viewBox, `stroke="currentColor"` at weight 5, paint set on a parent `<g>` with bare geometry inside, `fill="none"` explicit on stroked paths, a real `role="img"` + `aria-label`. No emoji and no icon-font glyphs anywhere in this project.
6. Add one line to `hub.css`: `.board--<slug> { --field: var(--f-<slug>); --on-field: … }`, plus the `--f-<slug>` token in `:root`. Nothing else — widths come from `nth-of-type` position and the slot resizes itself via `:has()`.
7. Add a reader to `readers` in `hub.js` (returns the printed record line, or `null` for unplayed) and a matching line to `unplayed`. Both are keyed by the `data-record` value.
8. Update this file's **Games** section below, and add the game's field colour to `DESIGN.md`.

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

Grid game playable two-up on one screen or against the computer — `index.html` + `style.css` + `script.js`, no shared state with other games. Board state, current player, the opponent, and a persistent scoreboard all live in one IIFE in `script.js`. Winning line is drawn with an SVG `<line>` overlay positioned by cell index math (`cellCenter`) and animated in with `stroke-dashoffset`. Code conventions: ES5 (`var`, `function`), same reasoning as D.C. Romp — no transpiler, keep it consistent within the file.

**The computer is beatable on purpose.** `chooseMove` takes a win, blocks a loss, and otherwise prefers the centre, then a random free corner, then a random free side. What it deliberately never does is look a move further ahead, so it walks into a fork: take two opposite corners and it must answer the threat already on the board while you build a second one it cannot cover. That ceiling is the design, not a shortcut — tic tac toe is solved, so a minimax opponent cannot be beaten at all, only drawn, and an opponent you can never beat is a wall rather than a game. Against random play it wins about 80% and loses about 2%; the corner fork beats it every time.

**Two tallies, not one.** `localStorage` key `ttt_scores_v2` holds `{mode, two: {X, O, draws}, cpu: {X, O, draws}}`, so beating the computer cannot inflate a two-player record. The board shows the tally for the mode you are in, and "Reset the score" clears only that one — wiping a record you cannot see from a button you can is the kind of thing nobody forgives. `v1` was a flat `{X, O, draws}` and only ever held two-player games, so it migrates into `two` on first load; the old key is left in place because `hub.js` still reads it as a fallback for anyone who has not reopened the game since. The hub strip sums both tallies, which is consistent with what it has always meant — it reports a board, and has never claimed to know who X and O were.

**Who opens depends on the opponent.** Two players alternate the opening each round (`newRound`), so wins aren't biased toward whoever goes first; against the computer you are always X and always open, which is the one advantage on offer against something that never blunders a block. The header rule line and the score-plate labels are rewritten by `applyMode` to say which of those is in force.

The computer's reply is scheduled on a `setTimeout` (`THINK_MS`), because a move that lands the instant you lift your finger reads as the board glitching rather than as an opponent answering. Three things can happen inside that delay — a second click, the board being cleared, the opponent being switched — so `render` disables every cell while it is the computer's turn, `newRound` and `setMode` both call `cancelThinking`, and the timer re-checks the mode, the turn and `gameOver` before it plays.

### Math Puzzles (`games/math-puzzles/`)

Three selectable math puzzle types, each with Easy/Medium/Hard difficulty and an Untimed/Timed toggle. Difficulty comes from puzzle-solving cleverness, not math content — nothing here goes past 7th-grade arithmetic (fractions, negatives, order of operations). DOM-driven, no canvas — a deliberate departure from D.C. Romp's rendering approach, since number entry and grid clicking are much more natural as real `<input>`/`<button>` elements than hand-rolled canvas hit-testing.

**Shared module interface**: `rational.js` and `storage.js` load first (dependency order in `index.html`), then each puzzle type's own file (`make24.js`, `calcudoku.js`, `pyramid.js`), then `app.js` last. Each puzzle file is an ES5 IIFE attaching itself to `window.MathPuzzles[type]` and exposing exactly 4 functions: `generate(difficulty)` → a puzzle-specific state object, `render(container, puzzleState, {onSolved})` → builds the DOM and wires interaction (calls `onSolved()` the instant it detects a win), `checkSolution(puzzleState)` → `{solved, ...}`, `getHint(puzzleState)` → mutates `puzzleState` and the already-rendered DOM in place. `app.js` never touches puzzle-specific internals — it only calls these 4 functions, so adding a 4th puzzle type means writing one new file matching this interface, a script tag, and a `.type-card` in `index.html`'s menu screen.

**State machine** (`app.js`, no game loop — pure event-driven, `setInterval` only for the visible Timed-mode readout): `menu → settings → playing → solved`, back-linked at every stage. Leaving `playing` without solving (Back to Menu / New Puzzle) calls `Storage.recordAbandon`, which resets that puzzle-type+difficulty's streak but never its lifetime solved count or best time.

**Stats persistence**: `localStorage` key `mathpuzzles_stats_v1`, shape `{make24: {easy, medium, hard}, calcudoku: {...}, pyramid: {...}}` where each leaf is `{solved, currentStreak, bestStreak, bestTimeMs}` — same try/catch + in-memory-fallback pattern as Tic Tac Toe's `ttt_scores_v2`. `bestTimeMs` only updates on Timed-mode solves.

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

The default is classic 4×4, with 3×3 and 5×5 bonus grids. Every new game starts with two tiles. A successful move spawns one tile in 3×3/4×4 and two in 5×5 (only one if that is all the space left); a no-op spawns nothing. Each grid has its own saved game, best and undo history, and switching resumes that grid.

**Tile ids are the whole design.** A board is a 3×3, 4×4 or 5×5 matrix of `null` or `{id, value}`, and `Board.move` returns a *brand-new* board plus `moves` (per tile id, the cell it lands in), `merges`, `gained` and `moved`. `Board.create(size)` defaults to 4; other operations derive the size from their matrix. Ids survive a move, which is what lets `game.js` animate by moving the *same* DOM node (kept in `nodes`, keyed by id) instead of redrawing the grid. `move()` never touches the board passed in, so the caller can keep the old one.

**Both halves of a merge slide onto the same cell** and get a `moves` entry each; the absorbed one is pushed to a lower `z-index` and removed by the single `setTimeout(..., MOVE_MS)` that also relabels the survivor and drops in the new tiles. `MOVE_MS` must stay in sync with the `.tile` transform transition in `style.css`. The `pop`/`appear` keyframes drive `transform` themselves and outlast `MOVE_MS`, so `doMove` strips those classes and forces a reflow before setting any new position — otherwise a tile still mid-animation jumps instead of gliding. A `busy` flag blocks input, restarting and grid switching during the slide.

Positions are set as `--r`/`--c` custom properties, never as pixel offsets: `.tile`'s `transform` derives its translate from `--tile` and `--gap`, which are declared once on `.board`. `--size` sets the row/column count; `--tile` divides the responsive tray width after reserving borders and gaps, so every size fits on a phone. Change tile geometry there and everything (background cells, board size, tile positions, keyframes) follows.

**Undo** pushes a `{values, score, won, keepPlaying}` snapshot before every move that actually moves something, capped at `UNDO_LIMIT` (25). Restoring goes through `Board.fromValues`, which deliberately assigns **fresh ids** — an undone board is rebuilt from scratch in the DOM (`rebuild()`), so reusing old ids could collide with elements still on screen. Undo is also offered on the game-over overlay, so a fatal move is recoverable.

`2048_state_v1` keeps the original classic save format and remains the hub's record source. The bonus saves use `2048_state_3_v1` / `2048_state_5_v1`; `2048_size_v1` remembers the selected size. Each save persists the board, score, best, win flags **and the undo history**, so undo survives a reload or a grid switch. Anything malformed or of the wrong size (`Board.isValidValues(values, size)`) falls back to a fresh game rather than throwing; invalid undo snapshots are skipped.

Reaching 2048 sets `won` and shows the win overlay once; "Keep going" sets `keepPlaying` so it never reappears and only game-over is checked from then on.

### Terms & Conditions (`games/terms-and-conditions/`)

A reaction game about small print. One instruction is printed large —
`CLICK THE BIGGEST SHAPE` — and directly beneath it a numbered list of clauses
conditionally overrides it ("Except when the backdrop is yellow, click the
smallest shape"). A new clause arrives every third correct answer and the clock
shortens; one wrong answer or one timeout ends the run, and best streak is the
score.

**The menu explains nothing on purpose.** It prints one line — "Follow the
instructions carefully" — plus the best streak and a keyboard note. An earlier
build printed the whole agreement there: precedence, the ramp, the lot. That is
the one explanation this game must not give, because working out that the small
print overrides the headline *is* the game. The clauses arrive one at a time on
their own screen, which is teaching enough.

Script order in `index.html` is the dependency graph: `clauses.js` → `round.js`
→ `storage.js` → `game.js`. `clauses.js` and `round.js` are **pure** — no DOM,
no timers — which is what makes the whole thing checkable without a browser.

**`clauses.js` holds the one invariant that matters.** A clause is
`{id, rank, text, when, pick}`, where `text` is the printed English and
`when`/`pick` are the code. If those two ever disagree, the game is lying to the
player, and that is the worst bug it can have. `resolve()` starts at the
headline's target and lets every clause whose `when` is true replace it, walking
in printed order — so **the later clause wins**, and since new clauses are
appended at the bottom, the newest is always the most powerful. Every `text` is
phrased `Except when …`, which is how that relationship gets printed rather than
merely implemented.

**A clause's text must state its WHOLE firing condition**, not a friendly
approximation. This is the corollary that is easy to get wrong and shipped
broken once: "If there is a star, click the star" reads as though it fires
whenever a star is on the sheet, but the code needs *exactly one* star to be
able to name a single shape, so a player looking at two stars cannot tell
whether the clause is live. Every clause now spells out the count it needs
("exactly one shape is a star"), even where that costs a few words. The
self-check's independent readings are written from the text alone, so a clause
that hides a count fails there.

**Shape sizes are perceptual, and split between two cues.** A shape's `size` is
its intended visual weight; the box it is drawn in is `size × KIND_SCALE[kind]`.
An eye reads "big" two ways at once — ink on the paper, and how far the shape
reaches — and for different silhouettes those cannot both be exact. Scale to
equal *ink* and the star's box runs well over the square's, so a smaller star
looks wider than a bigger square; scale nothing and equal boxes differ ~1.44x in
ink. The first of those was the original build, and it is what made "which is
biggest" genuinely hard to answer.

So `KIND_SCALE` is the **square root** of the ink-equalising factor
(`AREA_WEIGHT = 0.5`). Both cues are then off by the same modest factor, which
is the smallest that factor can be made: extent needs `step > (Kmax/Kmin)^t` and
ink needs `step > (Kmax/Kmin)^(1-t)`, and those are jointly hardest at `t = 1/2`.
With the `SIZE_POOL` steps at ~1.27x, one step up is at least **1.16x wider and
1.34x more ink**, whatever the two silhouettes — so nothing on the sheet
disagrees with anything else about which shape is bigger. The glyphs are also
drawn as full as their silhouettes allow (a nearly box-filling triangle, a fat
star at `innerRatio 0.66`), which is what keeps `Kmax/Kmin` near 1.10 and leaves
both margins comfortable. `GLYPH` stores each kind's defining geometry once and
both the SVG path and the area are derived from it, so the drawn shape and the
maths cannot drift apart. Don't hand-edit a scale factor, and don't slim the
star back down without re-reading the self-check's reported margins.

**`round.js` rejects rather than constructs.** It builds a candidate, resolves
it, and keeps it only if it passes `dealable()`: the answer resolves to exactly
one shape, every clause that fired could name exactly one shape (a selector
returns `-1` precisely when it cannot), and — the **override law** — if any
clause fired, at least one of them moved the target off the headline's pick.
That last rule is what stops rounds where the fine print switches on and
changes nothing, which would quietly teach the player not to read. It is
deliberately written as "some clause moved the target" and not "the answer
differs from the headline", so that reinstatement clauses like
`no-circle-biggest` still work. It also targets `FIRE_RATE` (~half of rounds
decided by a clause) and spreads *which* clause decides: if clauses rarely fire
the right strategy is to ignore them, and if they always fire the right strategy
is to ignore the headline. Either way the game stops being about reading.

**Two runs must not be the same lesson.** The catalogue holds 18 clauses across
6 difficulty tiers (`rank`), and `runOrder()` deals **one clause per tier,
easiest tier first** — so a run sees 6 of the 18 and `RUN_CLAUSES` is just the
tier count rather than a number typed in two places. With three clauses a tier
that is 729 different sets of small print, while the shape of the ramp never
varies: slot 1 is always tier 1 and slot 6 always tier 6, because a run that
opened with "one colour appears twice and no colour appears more often" would
not be teaching, it would just be losing. **Keep the tiers evenly stocked** when
adding clauses — a tier holding one clause is a slot that prints the same line
every run, which the self-check fails on.

The `fallback()` round switches off all but one clause in the catalogue, and it
is resolved **with** the live clause list. Resolving it against `[]` and then
printing the live clauses is a trap worth naming: with `three-left` active, a
three-shape fallback would print a clause that plainly applies while the stored
answer ignored it. The one clause it cannot dodge is `four-second-smallest`,
because avoiding it needs fewer than four shapes while avoiding `blue-middle`
needs an even count and three is `three-left`; that is harmless, since it picks
the second smallest and so satisfies the override law rather than breaking it.

**The clock is never counted in ticks.** One `rAF` loop recomputes the
remainder from a wall-clock deadline (same rule as the rest of the repo). It
pauses on `visibilitychange` and `blur`, and separately carries a **stall
backstop**: a gap over `STALL_MS` between frames is treated as time the player
was not present for and handed back, because a closed lid or a sleeping machine
takes real time without firing either event. `unpause()` and `dealRound()` both
clear `lastFrameAt`, or the same absence gets refunded twice — `rAF` does not
run in a hidden tab, so that variable is stale by exactly the gap `unpause`
already credited.

Persistence is `terms_stats_v1` — `{bestStreak, runs, bestClauses}` — with the
same merge-onto-defaults load and try/catch fallback as the other games.

**Colour is never the only channel.** Every shape prints its colour as a word
and the sheet carries a corner stamp naming the backdrop, so the colour
clauses are playable without colour vision. Each shape's `aria-label` announces its size
*rank* rather than a pixel value, which gives a screen-reader player exactly the
ordering a sighted player reads off the sheet and nothing more. Keys `1`–`9`
pick a shape and Enter/Space advances every screen. The clause list is placed
directly under the headline rather than in a footer — a rider that contradicts
a line has to be read next to that line — and carries an aria-label, since
removing its visible heading would otherwise leave it unnamed.

### Verifying Terms & Conditions

Two committed Node scripts, both run with plain `node` and no dependencies.
They exist rather than being throwaway because this game promises the answer was
always there in the small print, and that promise is checkable:

- **`node selfcheck.js`** — the pure engine over 4,000 generated rounds at every
  clause depth. The load-bearing trick is that it **re-implements each clause
  from its printed English**, reading only attributes a player can see, and
  asserts the clause's own `when` agrees; a clause that drifted from its wording
  or keyed on something invisible fails here. It also proves BOTH size cues —
  ink area and drawn width — are strictly monotone in `size` for every kind and
  size pair and reports the two worst-case margins, checks each glyph stays
  inside its box, checks the override law and the fallback (against every clause
  alone, and against 200 real run orders), checks the tiers are evenly stocked
  and that 400 runs deal plenty of distinct clause sets, and reports the fire
  rate and the spread of deciding clauses.
- **`node playcheck.js`** — the whole game, `game.js` included, against a small
  fake DOM and a hand-pumped clock (the pattern described for Tetris and 2048
  below). It decides what to click by **reading the fake DOM the way a player
  reads the sheet** — the backdrop stamp, each shape's printed label, the
  numbered clause list — rebuilding the round from that alone and resolving it
  independently. A passing run is therefore evidence that everything needed to
  answer is actually printed. It also covers the ramp, the amendment beat, focus
  handling, the drain of the time bar, both suspend paths, the loss and timeout
  screens and their wording, the stored record, a keyboard-only run, and — by
  restarting fourteen times and reading the amendment screens — that two runs
  are dealt different small print.

Neither covers pixels. For those, drive the game in headless Chrome through a
sized iframe with `--allow-file-access-from-files` (headless clamps a real
viewport to a 485px minimum, so a true 390px capture needs the iframe), play it
synchronously in one tick so no virtual time passes mid-run, then fire a `blur`
at the iframe's window to freeze the clock before capturing.

### Nonogram (`games/nonogram/`)

The numbers beside each row and column are the run lengths of ink
in that line, in order, and reconstructing them turns a blank grid into a
picture. Three sizes (5×5, 10×10, 15×15), 40 hand-drawn plates, best time kept
per plate.

Script order in `index.html` is the dependency graph: `nonogram.js` →
`pictures.js` → `storage.js` → `game.js`. The first two are **pure** — no DOM,
no timers — which is what makes the guarantee below checkable.

**THE GUARANTEE: every plate is finishable by deduction alone.** Never a guess,
never a 50/50 you discover was wrong twenty moves later. This is enforced, not
intended: `nonogram.js`'s `solveLine` finds *every* deduction available from a
single line (it walks all arrangements of the runs consistent with what is
known and keeps what they agree on), `solve` runs rows and columns to a fixed
point, and `isFair` requires that to finish a plate from blank. Because every
write is forced by one line, finishing that way is also proof the solution is
unique — so fairness and uniqueness are the same check. `selfcheck.js` runs it
over all 40 plates and fails the build on any that stalls.

**Plates are drawn, not generated** (`pictures.js`). A random grid of the right
density is solvable but resolves into noise, and the payoff of the form is that
the last few squares turn a field of marks into something you recognise. The
plate's title is therefore hidden — in the index and while playing — until it is
finished; the reveal is the reward, and `playcheck.js` asserts the name does not
leak. When adding a plate, expect symmetric hollow shapes to be the thing that
stalls the solver; breaking the symmetry slightly is normally enough.

**Marks are three-state**, and `EMPTY` means "the player asserts this is blank",
not "untouched". Winning compares ink only (`isComplete`), so crossing off the
blanks is bookkeeping the player may skip entirely. Nothing ever tells them
mid-plate that a square is wrong — being interrupted with that would do the
deducing for them. `mistakes()` exists for the finish card and for explaining a
contradiction, not for live validation.

**The hint is the solver, seeded with the player's own marks**, so it can only
say what the numbers already say — it never consults `pictures.js`. If those
marks contradict the clues, `solve` returns `contradiction` and the hint says so
and points at the offending square; that is the one place the picture is
consulted, and only to locate what the player got wrong.

**The board is one CSS grid** whose first row and column are the clue gutters,
so numbers and squares cannot drift out of alignment — which they would if the
gutters were separately sized boxes. The track lists are written out by
`game.js` rather than using `repeat(var(--dim), …)`. `sqClass` is the single
place that decides a square's ruling (heavy every fifth line, outer rule on all
four edges), used by both the build and the redraw so they cannot disagree.
`.press` and `.board` are `width: fit-content` on purpose: the gutter track is
`auto` and would otherwise swallow every spare pixel and push the numbers off
their own grid.

Elapsed time is banked from a wall-clock base (`clockOff` adds to `state.base`),
never counted in ticks, and stops on `visibilitychange` and `blur`. Persistence
is `inkbynumbers_stats_v1` — the key predates the rename from Ink by Numbers
and is deliberately frozen so existing times survive it. It holds the best time
per plate, plus the plate **currently in progress** as a flat string of marks —
a 15×15 is twenty minutes of careful deduction and losing it to a stray reload
would be unforgivable, the same reasoning as 2048 keeping its board and undo stack.

Pointer input cycles ink → cross → clear, a drag applies whatever the first
square became (so sweeping a run does not toggle each square in turn), and the
right button goes straight to a cross. Keyboard: arrows move, `Space` inks, `X`
crosses, `H` hints, `Esc` steps back. Every square carries
`aria-describedby="rc<y> cc<x>"`, so a screen reader reads the two clue lines
that govern it rather than making the player go and find them.

### Verifying Nonogram

Two committed Node scripts, both plain `node`, no dependencies:

- **`node selfcheck.js`** — the solver on its own (overlap deductions, blank
  lines, impossible lines, and that its output is idempotent, which is what
  "every deduction is sound" means in practice), then every plate: right shape
  for its size bucket, clues that total the ink they describe, sane density,
  unique ids and names, the win test accepting the finished plate and rejecting
  it with any single square wrong or missing, winning without crossing off the
  blanks — and the fairness check above.
- **`node playcheck.js`** — the whole game against a fake DOM and a clock we
  own: the screen machine, three-state marking and its `aria-label`, the ruling
  classes, the hint (including that a hint's claim matches the plate *and* that
  the square it names actually carries the mark), finishing, the withheld title
  appearing in the index afterwards, a slower second run not overwriting the
  best time, a keyboard-only finish, `Esc` walking back out, the clock stopping
  while the tab is hidden, and — by rebooting the game against the same
  storage — that a part-finished plate and its clock survive a reload. It solves
  by **reading the clue gutters back out of the DOM**, so a pass is evidence the
  printed numbers are sufficient.

For pixels, drive it in headless Chrome through a sized iframe with
`--allow-file-access-from-files`, clicking real squares.

### Verifying Tetris and 2048

Neither has a test runner, but both split their logic out of the DOM specifically so it can be checked headlessly, and the generation/rotation/merge rules are fiddly enough to be worth re-checking after a change. A throwaway Node script that `vm.runInContext`s the files with `window` stubbed to the sandbox object (they're plain `<script>`s, not modules) covers the pure logic: SRS states are 4 connected in-box cells, all 8 kick transitions exist, every piece rotates freely on an empty board, `dropDistance` lands exactly on the floor, rows clear with the rows below keeping their contents, each 7-bag window holds all seven types; and for 2048 that `[2,2,2,2]` left is `[4,4]` (each tile merging at most once), the near pair merges first, `moved` is false for a no-op, ids survive a slide, and — the strongest invariant — that over thousands of random moves the sum of all tiles always equals the sum of everything ever spawned, since merging preserves the total.

Both games' `game.js` can also be driven end-to-end against a small fake DOM (stub `getElementById`/`createElement`, a no-op canvas 2D context, `localStorage`, and a manually-pumped `requestAnimationFrame`/`setTimeout` clock). Two things to know when doing that: pin `Tetromino.bag` to a single piece type to make a line clear deterministic, since random Tetris play leaves unfillable holes and effectively never completes a row; and advance the clock in frame-sized steps, because of the `dt` clamp noted above.

## Notes

An OpenAI Codex config exists at `~/.codex/config.toml`. To pull anything importable from it (MCP servers, slash commands, subagents, skills, instructions) into Claude Code, reply `/import` to see a scan of what's available, then `/import --yes=<digest>` to apply. If `/import` isn't available on this surface, run `claude import` from a terminal.
