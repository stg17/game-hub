---
name: Game Hub
description: A boxed compendium of browser games, laid out as separately printed boards on a bottle-green table.
colors:
  table: "#123b2c"
  table-deep: "#0d2b20"
  table-weft: "#16452f"
  tray: "#6d5a41"
  tray-cut: "#4a3d2c"
  ink: "#171410"
  ink-70: "rgba(23, 20, 16, .70)"
  ink-45: "rgba(23, 20, 16, .45)"
  ink-30: "rgba(23, 20, 16, .30)"
  ink-15: "rgba(23, 20, 16, .15)"
  ink-08: "rgba(23, 20, 16, .08)"
  paper: "#e6dcc4"
  paper-dim: "#c3b696"
  red: "#b32d17"
  red-lit: "#e8542f"
  gold: "#e8c25a"
  gold-dim: "#d9b46a"
  field-tetris: "#1f4f9c"
  field-2048: "#d8912a"
  field-ttt: "#155e58"
  field-math: "#6a2e5c"
  field-romp: "#4aa3d8"
typography:
  lid:
    fontFamily: "Lid, Georgia, serif"
    fontSize: "clamp(40px, 8.5vw, 88px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.012em"
  page-title:
    fontFamily: "Lid, Georgia, serif"
    fontSize: "clamp(38px, 9vw, 60px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.012em"
  board-title:
    fontFamily: "Lid, Georgia, serif"
    fontSize: "clamp(21px, 2.3vw, 27px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Slab, Georgia, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  rule:
    fontFamily: "Slab, Georgia, serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  numeral:
    fontFamily: "Slab, Georgia, serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  spec:
    fontFamily: "Slab, Georgia, serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.15em"
  stamp:
    fontFamily: "Slab, Georgia, serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.16em"
  control:
    fontFamily: "Slab, Georgia, serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.15em"
rounded:
  none: "0"
spacing:
  edge: "6px"
  edge-narrow: "5px"
  keyline: "3px"
  xs: "8px"
  sm: "10px"
  md: "18px"
  lg: "26px"
  xl: "44px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-dim}"
    textColor: "{colors.ink}"
  button-disabled:
    backgroundColor: "{colors.paper-dim}"
    textColor: "{colors.ink-45}"
  hub-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "9px 16px 10px"
  hub-link-hover:
    textColor: "{colors.red}"
  head-plate:
    backgroundColor: "{colors.field-tetris}"
    textColor: "{colors.paper}"
    typography: "{typography.page-title}"
    rounded: "{rounded.none}"
    padding: "22px 104px 24px 24px"
  board-field:
    backgroundColor: "{colors.tray}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "18px"
  board-foot:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "14px 16px 15px"
  set-stamp:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "5px 10px 4px"
  slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "13px 16px 14px"
  badge-status:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.spec}"
    rounded: "{rounded.none}"
    padding: "3px 8px 2px"
  empty-slot:
    backgroundColor: "transparent"
    textColor: "{colors.paper-dim}"
    rounded: "{rounded.none}"
    padding: "26px 18px"
---

# Design System: Game Hub

## Overview

**Creative North Star: "The Compendium Box"**

The page is the inside of a boxed set of games. A bottle-green baize table fills the frame; the lid is propped at the top edge carrying the wordmark; the games are laid out on the table as separately printed boards, each with its own die-cut components, its own printed field colour, and its set number stamped into the corner. Nothing here is a card in a card grid — every surface is a piece of board stock with a real cut edge.

The material rules are absolute and they are what make the world hold together across eight independently-built folders. Depth is never light: no gradient, no blur, no glass, no soft shadow, no tonal lift anywhere in the shipped build. One flat plate overlaps another, the way die-cut board actually stacks, and the plate's thickness is drawn as a hard black offset with no falloff. Colour is unmixed and printed at full strength. Every keyline is 3px of warm printed black. Where the box needs texture — the baize weave, the empty slot's hatch — it is hard-stop 1px repeating rules, never soft noise or blended fill.

Density is composed rather than uniform. The hub's tray is a drawn twelve-column plan composed row by row: each board is given its width by hand, rows add up to twelve, and every board in a row shares one height so the tops and bottoms line up. A tall narrow Tetris well is answered by a wide short D.C. Romp beside it, both level. Inside each game the same vocabulary reappears: a full-strength head plate in that game's own colour, paper slips for numbers, ink-stamped set numbers, and one reserved red for the thing you press.

**Key Characteristics:**
- Flat unmixed printed colour; no gradient, blur, glass, or soft shadow anywhere
- Depth by overlap only — a hard offset plate of ink under every printed surface
- Square corners throughout (0 radius, no exceptions in the build)
- 3px warm-black keyline on every plate, chip, tile and input
- One reserved action colour (chrome red); gold is status, never a control
- Every surface carries its set number, so any single screenshot names its piece
- The system is duplicated into each game folder, never linked

## Colors

Printed inks on board stock: one deep bottle-green ground, warm black keylines, pulpboard paper for anything that carries reading matter, and one saturated field per game.

### Primary
- **Chrome Red** (`{colors.red}`): the single reserved action colour. Primary buttons, canvas menu chips in their selected state, hover colour on titles and the back tab, and the score-gain flash. Nothing else may take it.
- **Lit Chrome** (`{colors.red-lit}`): live state and focus only — the 3px focus-visible outline on every surface, the turn lamp in Tic Tac Toe, the winning-line stroke. It is the only element in the world allowed to read as lit.

### Secondary
- **Bottle Green Table** (`{colors.table}`): the page ground on all eight surfaces, woven with hard 1px rules in **Table Weft** (`{colors.table-weft}`) and darkened to **Table Deep** (`{colors.table-deep}`) for scrollbar tracks, the lid recess and the highest 2048 tiles.
- **Chipboard Tray** (`{colors.tray}`, cut face `{colors.tray-cut}`): the default board field when a game has no colour of its own, and the scrollbar thumb.

### Tertiary — the printed fields, one per game
Each game owns exactly one colour, used at full strength on its hub board and again as that game's page head plate. They are identity, not decoration, and they are never tinted, mixed or gradiated.
- **Cobalt** (`{colors.field-tetris}`) — Tetris, No. 01
- **Ochre** (`{colors.field-2048}`) — 2048, No. 05
- **Teal** (`{colors.field-ttt}`) — Tic Tac Toe, No. 06
- **Plum** (`{colors.field-math}`) — Math Puzzles, No. 04
- **Sky** (`{colors.field-romp}`) — D.C. Romp, No. 02
- **Document Slate** (`{colors.field-terms}`) — Terms & Conditions, No. 03
- **Press Brown** (`{colors.field-ink}`) — Nonogram, No. 07

### Neutral
- **Printed Black** (`{colors.ink}`): every keyline, every cut edge, every set stamp ground, and body text on paper. Its alpha steps (`{colors.ink-70}` secondary copy, `{colors.ink-45}` disabled, `{colors.ink-30}` and `{colors.ink-15}` rules and wells, `{colors.ink-08}` printed grid tint) are the only tonal scale in the system.
- **Pulpboard** (`{colors.paper}`): the stock for label strips, slips, overlays, buttons and the back tab, and the text colour on any dark field. Never the page ground.
- **Dimmed Pulpboard** (`{colors.paper-dim}`): the empty slot's copy, ghost-button hover, and disabled fills.
- **Stamp Gold** (`{colors.gold}`, dimmed `{colors.gold-dim}`): status and marking only — the set line under the lid, message plates, cage dashes, the O mark, collectible pips, and the ring around a 2048 tile.

### Named Rules
**The One Red Rule.** Chrome red is the only action colour in the box. If an element is not the thing you press or the thing that is live right now, it is ink, paper or a field colour.

**The Gold Is Not A Button Rule.** Gold marks state — a badge, a message plate, a scored tile's ring, a printed set line. It never fills a control. A control is red (primary) or paper (ghost).

**The Full Strength Rule.** A field colour is used as mixed by the press. There is no 12%-tint background, no lightened hover fill, no colour-mixed variant. If a surface needs to read quieter, it changes stock (paper vs field), not opacity of a hue.

## Typography

**Display Font:** Lid (Bevan, 400) with Georgia, serif
**Body Font:** Slab (Zilla Slab, 400/700) with Georgia, serif

Both faces ship as base64 `@font-face` data URIs in `type.css`, byte-identical in all eight folders, because Chrome will not fetch font files over `file://`.

**Character:** A heavy poster slab against a working text slab — the lid shouts the set's name in one weight, and everything that has to be read or counted is set in the lighter companion. There is no third family, no sans, and no icon font.

### Hierarchy
- **Lid** (400, `clamp(40px, 8.5vw, 88px)`, 1.0, uppercase): the wordmark on the propped lid. One per set.
- **Page Title** (400, `clamp(38px, 9vw, 60px)`, 0.95, uppercase): the h1 inside each game's head plate.
- **Board Title** (400, `clamp(21px, 2.3vw, 27px)`, 1.0, uppercase): the game name on a hub board's label strip; also canvas menu titles at 42–54px via `Game.UI.title`.
- **Body** (400, 16px, 1.55): the page default everywhere.
- **Rule line** (400, 14.5px, 1.45, max 46ch): the one-sentence explanation of a game under its title. Head-plate rules run 15px on the same 46ch measure.
- **Numeral** (700, 21–27px, tabular-nums): every score, best, timer and tile value. Numerals are always Slab 700 and always tabular.
- **Spec / Stamp / Control** (700, 11–12px, `0.15em`–`0.18em`, uppercase): printed spec strips, set stamps, panel labels, button labels, the back tab.

### Named Rules
**The Two Faces Rule.** Lid is for lids, board titles and page titles. Everything else — including every numeral — is Slab. Adding a third family breaks the box.

**The 11px Floor Rule.** No functional text is set below 11px. The tracked-caps spec strip at 11px/`0.15em` is the smallest legible unit in the system and it is a printed form, not shrunken body copy.

**The Tracked Caps Rule.** Uppercase is reserved for printed apparatus — spec strips, set numbers, labels, control faces. Sentences stay sentence case. Canvas has no letter-spacing, so `Game.UI.tracked()` spaces caps glyph by glyph to match.

## Layout

**The hub tray is a drawn twelve-column plan**, `repeat(12, 1fr)` at `gap: 26px`, max-width 1320px, `align-items: stretch`. The plan is composed by hand rather than cycled: each board states its own `grid-column: span n` and its own `--art-cap` on the same line as its field colour. Rows are 3+6+3, then 6(5)+4+3, then 7 with the slot closing on 5. Because the row stretches, every card in it ends on the same line top and bottom while the widths stay deliberately unequal; the coloured field takes up the slack, with the drawing centred in it. 2048 is the one card with a stated `aspect-ratio: 1` — it is the tallest thing in its row, so its perfect square is what sets that row's height, and `align-self: start` keeps a stretched height from ever squashing the ratio.

**Consequence, and the point of the plan:** adding a game is one `<a class="board">` element in `index.html` plus a `--field` line. No CSS edit, no renumbering, no slot maths.

**Responsive.** At `≤1080px` the plan collapses to two per row and stays deliberately unequal — 7 and 5, never matching halves — and 2048 drops its square, which belongs to the composed wide plan only. At `≤700px` every board goes full width (`--art-cap: 220px`), `--edge` drops 6px → 5px, `--gap` 26px → 20px, and the slot's minimum height drops to 150px. Game pages centre a `.wrap` (560–720px depending on the game) with `padding-top: clamp(74px, 12vw, 104px)` to clear the fixed back tab. Tetris's narrow rule reorders both component trays *above* the well so score, hold, next, lines and level stay on screen with the playfield.

**Rhythm.** Page padding `0 clamp(16px, 4vw, 56px) 72px`. Internal padding runs on a coarse scale: 9–10px inside small slips and stamps, 12–18px inside controls and board fields, 22–26px inside head plates and the lid. Gaps are 10px (control rows), 12px (panels, scoreboards), 26px (the tray).

### Named Rules
**The Composed Plan Rule.** Boards on the table are deliberately different sizes on one plan. A dense board is answered by quiet table. Never render the collection as a uniform grid of equal plates — but do keep a row level: within one row every card starts and ends on the same line, so unequal widths read as composition rather than as drift.

**The Open Slot Rule.** The set is open-ended, and the next space is printed with its number rather than hidden. The slot is an invitation — a dashed die-cut outline with a hatch — not a disabled card.

## Elevation & Depth

**There are no shadows in this system in the lighting sense.** No blur radius is used anywhere in the shipped build; no `filter`, no `backdrop-filter`, no gradient fill outside the two hard-stop repeating-rule textures. Depth is one flat plate overlapping another.

Every printed surface draws its own board thickness as a hard, unblurred offset of pure ink, and reserves that thickness in the layout with a matching `margin-right` so the cut edge never overhangs the page. The offset scale is small and fixed by role.

### Shadow Vocabulary
- **Board edge** (`box-shadow: var(--edge) var(--edge) 0 0 var(--ink)`, `--edge: 6px`, 5px narrow): every major plate — hub board fields and label strips, head plates, score plates, panels, the 2048 tray, the Tetris stage.
- **Chip edge** (`box-shadow: 5px 5px 0 0 var(--ink)`): buttons, Make 24 tiles.
- **Slip edge** (`box-shadow: 4px 4px 0 0 var(--ink)`): the back tab, small record slips, numpad keys.
- **Lifted** (`+2px` or `+3px` on both axes, paired with an equal negative `translate`): hover and focus-visible. The plate is picked up off the table; nothing fades.
- **Pressed** (`2px 2px 0 0 var(--ink)` with `translate(2px, 2px)`): `:active`. The plate is pushed down into the table.
- **Punched well** (`box-shadow: inset 2px 2px 0 0 rgba(23,20,16,.18)` or `inset 0 0 0 3px <colour>`): a recess cut into a plate (2048 cells) or a printed ring around a tile. Inset only, never blurred.

Canvas surfaces obey the same rule by hand: `Game.UI.plate()` fills an ink rect at `+e, +e`, fills the face, then strokes a 3px ink keyline; `Render.block()` gives each Tetris token a flat darker lip along its bottom and right rather than a gloss highlight.

**Motion.** Transitions are announced, not faded: `.12s`–`.16s` on `transform` and `box-shadow` with `cubic-bezier(.2, .9, .3, 1)`, and `.12s linear` on colour swaps. Opacity is never used to convey elevation. All of it is disabled under `prefers-reduced-motion: reduce`.

**The opening.** The hub has one authored set piece, ~4.6s, built in `hub.js` and played once per browser session, in four beats on one clock: the closed box sits still on the table (0→1000ms), its cover lifts off while the cloth under it fades so the boards appear inside (1000→1800), everything holds long enough to take the mini boards in (1800→2500), then the view flies into the box until the boards are full size while the cover travels to the top-left corner and lands as the title tag (2500→4400). The beats live in five named constants at the top of the section; retiming the piece means editing only those.

The box is a **window onto the top of the page**, not walls around all of it — that is what lets the boards inside be large enough to read (three full boards at desktop widths, at roughly three quarters scale). `.boot-frame` is one element inside `.boot-stage`, and its concentric outer shadows do two jobs at once: the inner rings are the chipboard walls, and a final wide spread hides everything beyond the window. Because it lives in the stage, the single transform that flies the view in scales the box and the boards together, in registration, with no second animation to keep in step.

The window is **exactly the viewport plus a small margin** — and that is the entire requirement. It has to cover the viewport at `scale(1)` so every wall ends up outside the frame and the box can be removed at the end with nothing fading away in view. Asking for more than that (a boxier aspect ratio, a wider overhang) buys nothing and is paid for directly in how small the boards start. It also gives the piece a useful property: the window frames the above-the-fold view, so the flight reveals no new content. It is purely a camera move, and nothing inside the box ever moves on its own.

Two things that are easy to get wrong and silently ruin it:

- **Easing belongs on keyframes, never in the options.** An effect-level easing warps iteration progress *before* keyframe offsets are read, so a one-second hold becomes about two hundred milliseconds and every beat collapses. The named beats only mean what they say because every animation runs linear at the effect level. The stage and the cover must also share the same curve, or they visibly drift apart over the two-second flight.
- **The stage's `transform-origin` is its own top-left**, so the closed-box translate is measured from `sr.left`/`sr.top`, not from the viewport origin. Getting that wrong leaves the box off-centre by `sr.left * (1 - s0)`.

The cover and the tag are one object throughout — the flying element is a clone of `.lid__plate` inside a `transform-origin: 0 0` wrapper, so the plate keeps its own `rotate(-1.1deg)` while the wrapper carries the flight, and its final transform is `none`. That is what makes the last frame of the opening and the resting page the same thing rather than two things that resemble each other; it is verified by capturing both and comparing them byte for byte. Rules that hold: the intro is built by script and never by markup, so no-JS gets the finished page; every class and inline style it sets is removed at the end, with a hard timer as backstop; it is skippable by click, Escape, Enter or Space; and it never runs under `prefers-reduced-motion`. The printed mark beside the lid (`.lid__replay`) opens the box again.

### Named Rules
**The No Blur Rule.** Every `box-shadow` in this system has a blur radius of exactly 0. A blurred shadow, a gradient, a glass panel or a backdrop filter is out of world, full stop.

**The Reserved Thickness Rule.** A plate that casts a 6px cut edge also carries `margin-right: var(--edge)` (and where needed a matching bottom allowance). The board reserves its own thickness; it never overhangs its container.

## Shapes

Square corners, everywhere, with no exceptions in the build: `border-radius` is not set on a single element across the eight stylesheets. The form language is the die-cut rectangle — a hard 3px `var(--ink)` keyline around a flat fill, with an ink plate offset beneath it.

Recurring silhouettes:
- **The tab**: a plate with `border-top: 0`, hung from the top edge of the viewport and pushed *down* on hover. Used once per game page for the back link.
- **The corner stamp**: a solid ink rectangle flush into a plate's top-right corner (`top: 0; right: 0`), carrying tracked caps in paper. Every board and every head plate has one.
- **The registration mark**: a circle of r7 crossed by 22px rules, drawn in 28–30% ink at the corners of canvas sheets (`Game.UI.regMark`).
- **The die-cut outline**: 3px dashed pulpboard at 34% over a 135° 9px hatch — the empty slot, and the dashed cage strokes in Calcudoku and the Tetris ghost piece.
- **The rosette**: concentric 22.5/17 rings crossed axis to axis, the lid's printer's mark.

All iconography is inline SVG drawn from these same primitives with `currentColor` strokes. There are no icon fonts, no emoji, and no raster assets anywhere in the build.

**Board art carries no words.** A board’s drawing is a picture of the game — its pieces, its grid, its shapes — and never a caption, label or spec block set inside the SVG. The foot strip under the field already prints the title, the rule line and the spec, so a caption inside the art repeats it in worse type. Digits appear only where they are the subject of the drawing — 2048’s tile values, the numerals and arithmetic signs strewn across Math Puzzles — never as a caption or a label.

## Components

### Buttons
- **Shape:** square (0 radius), 3px ink keyline, chip edge (5px offset ink plate).
- **Primary:** chrome red ground, pulpboard label, Slab 700 12px/`0.15em` uppercase, `12px 18px`.
- **Ghost:** pulpboard ground, ink label, otherwise identical. Hover fills dimmed pulpboard in the puzzle toggles.
- **Hover / Focus-visible:** `translate(-2px, -2px)` with the edge grown to 7px — the chip lifts off the table.
- **Active:** `translate(2px, 2px)` with the edge shrunk to 2px — pressed in.
- **Disabled:** dimmed pulpboard ground, 45% ink text, border and edge both at 45% ink.
- **Canvas equivalent:** `Game.UI.button()` draws an unselected chip as a paper plate at edge 5 and a selected/hovered chip as a red plate at `+2, +2` with edge 3, plus a punched paper square in a reserved 24px gutter so the label never shifts between states.
- **Segmented control** (Tic Tac Toe's opponent switch): one plate cut into two, not two chips with a gap — the segments share a 3px ink edge so it reads as a single control with a position, which is what a two-way choice is. Unselected segments are pulpboard with a 70% ink label; the selected one is that game's field colour at full strength with a pulpboard label. **It is never red and never lit chrome:** red is reserved for the thing you press and lit chrome for live state, and a setting is neither. Focus-visible takes the global ring with `position: relative; z-index: 1`, or the plate's own shadow swallows it.

### Cards / Containers
- **Board (hub):** two stacked plates — a coloured `field` carrying the drawn components and the corner set stamp, and a pulpboard `foot` strip glued under it (`border-top: 0`) carrying title, rule line, spec strip and record strip. The label strip covers the field's lower shadow in every state, leaving no extra shadow line above the title. Both share the board edge and both lift together on hover, when the title also turns red.
- **Head plate (game page):** `width: fit-content`, that game's field at full strength, page title in Lid, the set stamp in the corner, and a 46ch rule line at 88% pulpboard where the game wants one — Tetris prints none, its controls being listed in the panel below. Padded `22px 104px 24px 24px` — the wide right inset is the stamp's reserved space.
- **Slip / panel:** pulpboard, 3px keyline, board or slip edge, `9px 10px 10px` to `13px 16px 14px`. Carries a tracked-caps label at 70% ink over a Slab 700 tabular numeral at 25–27px.
- **Overlay sheet:** a full pulpboard plate laid over the playfield (`inset: 0` / `inset: -3px`), centred, heading in Lid coloured with the game's field. It covers the board; it never tints or blurs it.

### Inputs / Fields
- **Style:** flat well on the plate, 3px ink keyline where the cell has its own border, Slab 700 tabular numerals, no radius, no placeholder chrome.
- **Focus:** background shifts to translucent gold (`rgba(232,194,90,.38)`) with the native outline removed on grid cells; every other focusable element takes the global 3px `{colors.red-lit}` outline at 3px offset.
- **Error:** red text on a 16% red wash (`.conflict`). No icon, no message chrome.

### Navigation
The only navigation between surfaces is the back tab: `position: fixed; top: 0`, pulpboard, 3px ink, `border-top: 0`, slip edge, an inline SVG chevron at 13px, label "Back to the box" in Slab 700 11.5px/`0.16em` caps. Hover pushes it *down* 3px and turns the label red. It appears identically on all seven game pages.

### The Record Strip
Every hub board prints what the box remembers about that game — best score, tally, puzzles solved, level unlocked — read live from that game's own `localStorage` key by `hub.js`. Set 12px Slab 700 tabular caps at `0.09em` above a 2px `{colors.ink-15}` rule. The unplayed state is a real state: it drops to 400 weight at 70% ink and reads as an invitation ("No score set yet"), never as a zero or a broken value.

### Set Numbering
Every surface in the box carries its number. `hub.js` numbers the boards from their DOM index and derives both the lid's spelled count and the empty slot's next number from the board count; the literals in the markup are a no-JS fallback only. Canvas surfaces stamp theirs with `Game.UI.setStamp()`.

## Do's and Don'ts

### Do:
- **Do** build depth as one flat plate over another: a 0-blur ink offset (`var(--edge)`, 6px desktop / 5px narrow) plus a matching `margin-right: var(--edge)` so the plate reserves its own thickness.
- **Do** give a new game exactly one printed field colour, used at full strength on its hub board and again as its page head plate.
- **Do** add a game as one `<a class="board">` in the tray plus one line in `hub.css` giving it a field colour, a `grid-column: span n` and an `--art-cap` — then re-check that its row still adds up to twelve and that the slot still closes the last one. `hub.js` handles the set number on its own.
- **Do** duplicate `type.css` and the `:root` token block into each new game folder. Per-folder independence is a product constraint, and Chrome cannot fetch `@font-face` files over `file://`, so the fonts must stay base64 data URIs.
- **Do** keep every numeral in Slab 700 with `font-variant-numeric: tabular-nums`.
- **Do** draw texture with hard-stop repeating rules — the 1px baize weave, the 9px die-cut hatch — and nothing softer.
- **Do** mirror the CSS vocabulary on canvas through `Game.UI.plate/sheet/regMark/setStamp/button/tracked` and `Render.block`'s flat cut lip.
- **Do** treat an empty or unplayed state as printed content: the numbered open slot, the "No score set yet" strip.

### Don't:
- **Don't** introduce a gradient, blur radius, `backdrop-filter`, glass panel, gloss highlight, or any tonal lift. Every shadow in this system is `0 0` blur/spread.
- **Don't** put a `border-radius` on anything. The build has none.
- **Don't** spend chrome red on anything but the primary affordance and live state, and don't put gold on a control.
- **Don't** tint, lighten or colour-mix a field colour to make a variant. Change stock (paper vs field), not the hue's strength.
- **Don't** extract the duplicated stylesheets or `type.css` into one shared file. The duplication is the distribution rule, not drift.
- **Don't** add a third type family, an icon font, an emoji, or a raster image asset. Icons are inline SVG built from the box's own marks.
- **Don't** set functional text below 11px, and don't use tracked caps for sentences — caps are for printed apparatus only.
- **Don't** lay the collection out as a uniform grid of equal cards, and don't render the next-game space as a disabled card.
- **Don't** restyle D.C. Romp's in-level world art. Characters, platforms, collectibles and parallax backgrounds are deliberately outside this system and keep their original cartoon look; only its menus, HUD, pause screens and page frame are in the box.
