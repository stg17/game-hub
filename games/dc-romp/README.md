# D.C. Romp

A browser-playable, cartoon-shaded side-scrolling platformer. No build tools or dependencies — pure HTML5 Canvas + vanilla JavaScript.

## Run it

Just double-click `index.html` to open it in your browser (Chrome, Edge, or Firefox recommended). Everything is plain `<script>` tags, so it works straight from disk.

If you'd rather serve it locally: `python -m http.server` (or `npx serve`) from this folder, then open `http://localhost:8000`.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move |
| ↑ / Space | Jump (hold for a higher jump) |
| Shift | Run |
| ↓ (while airborne) | Ground pound |
| X / Ctrl | Throw a necktie |
| Q | "The Greatest" catchphrase gag |
| Escape / P | Pause (from there: Resume, Restart Level, or Quit to Menu) |
| M | Mute |
| Arrow keys / Enter, or mouse | Navigate menus |

The catchphrase gag (Q) is a text-only speech bubble — no audio. A generic browser voice wouldn't sound like the character, so rather than fake it, the sound is just skipped.

## Levels

1. **White House Lawn** — intro level, gentle gaps and patrols.
2. **Downtown Street** — bigger gaps, more enemies, a couple of moving platforms.
3. **Capitol Rooftop** — vertical climb finale.
4. **Golf Course** — long fairway run with denser enemies and moving-platform water hazards.
5. **Air Force One** — the finale: elevated skybridges over a long fall, ending on the plane.

Levels unlock in order and your progress is saved in the browser's local storage.
