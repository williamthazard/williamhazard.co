# Design — Noise Text (Performance Variant)

**Date:** 2026-04-29
**Status:** Draft for review

## 1. Overview

Adapt the existing `noise-text` sketch into a live-performance variant controlled with a Midi Fighter Twister via WebMIDI. The autonomous "noise/intensity engine" that currently drives all audio and visual behavior in the original sketch is replaced by direct knob control, with one knob that re-introduces the autonomous engine as a modulation layer.

**The original `noise-text/` sketch is not modified.** The performance variant lives in a new sibling folder `noise-text-performance/`.

## 2. Goals

- Allow the operator to control all audio and visual parameters that `normInt` currently drives, plus a few additional creative parameters.
- Provide curated multi-parameter "macro" knobs for big gestures.
- Support bidirectional MIDI so the controller's LED rings reflect what the sketch is actually doing (especially during auto-scroll).
- Keep the on-screen aesthetic clean during performance; toggleable debug overlay for rehearsal.
- Auto-detect the MFT on connect, with a device-picker fallback if auto-detection fails.

## 3. Non-goals

- Multi-piece performance, presets, save/load of knob states.
- Free-form macro re-assignment via UI.
- Support for non-MFT controllers as a first-class case (the picker fallback exists but the layout is MFT-shaped).
- A real test framework with CI. Pure-function tests live in a single browser-loaded `tests.js`.
- Modifying `noise-text/`. The original is preserved untouched.

## 4. Folder layout

```
sketches/
├── noise-text/                      # original, untouched
│   ├── index.html
│   ├── sketch.js
│   └── assets/
└── noise-text-performance/          # new
    ├── index.html
    ├── test.html                    # loads tests.js for pure-function checks
    ├── tests.js                     # assertion-based tests, run on load
    ├── sketch.js                    # p5 lifecycle + audio chain wiring
    ├── params.js                    # parameter registry + setParam / mappedValue
    ├── macros.js                    # the four curated macros
    ├── engine.js                    # autonomous sine+Perlin engine (modulation source)
    ├── midi.js                      # WebMIDI I/O, device discovery, LED feedback
    ├── ui.js                        # Begin overlay, device picker, debug overlay
    ├── DESIGN.md                    # this file
    ├── MFT-MAPPINGS.md              # operator reference for knob layout
    └── assets/
        ├── perpetuum.txt            # copy of the poem
        └── we-live-inside-a-dream.mp3
```

Assets are duplicated (not symlinked) to keep the new sketch independently deployable.

## 5. Module structure

No build step. Plain `<script>` tags in `index.html`, loaded in this order:

```html
<script src="params.js"></script>
<script src="macros.js"></script>
<script src="engine.js"></script>
<script src="midi.js"></script>
<script src="ui.js"></script>
<script src="sketch.js"></script>
```

Each non-sketch file exports a single namespace via IIFE:

- `params.js` → `const PARAMS`
- `macros.js` → `const MACROS`
- `engine.js` → `const ENGINE`
- `midi.js`   → `const MIDI`
- `ui.js`     → `const UI`

`sketch.js` uses p5 global mode (matching the original) and depends on all five.

## 6. Architecture: parameter registry + dispatcher

A central `params` object inside `PARAMS` holds every controllable value. Each entry:

```js
{
  cc: 5,                           // MFT CC number (rotation)
  label: 'LPF Cutoff',
  range: [20000, 300],             // raw 0..127 mapped via curve to this range
  curve: 'expInverted',            // see Curves below
  manual: 0,                       // operator's set value (normalized 0..1)
  value: 0,                        // effective value after modulation pass (0..1)
  apply: (mapped) => lowPass.freq(mapped),  // called once per frame
  engineFn: (e) => e.normInt,      // optional; modulation source if mod > 0
  lastSentToLed: -1,               // for echo-loop avoidance + throttling
}
```

### Dispatch surface

`PARAMS` exports:

- `byName(name)` / `byCC(cc)` — lookups.
- `all` — iterable of every registered param (used by `modulationPass` and `applyAll`).
- `setParam(name, v)` — write to `manual`. Queues an LED echo. Logs to debug overlay.
- `setParamByCC(cc, raw0to127)` — normalize raw → 0..1 → `setParam`.
- `mappedValue(p)` — pure function: returns curve-applied value over `range`.
- `applyAll()` — once per frame: for every param, call `p.apply(mappedValue(p))`.

`MACROS.apply(name, v)` and switch CCs both flow through `setParam`. Single source of truth for `manual` writes.

### Curves

Implemented in `mappedValue`:

| Curve         | Definition                                                    |
|---------------|---------------------------------------------------------------|
| `linear`      | `lerp(range[0], range[1], v)`                                 |
| `exp`         | `range[0] * pow(range[1] / range[0], v)`                      |
| `expInverted` | same as `exp`, but `range` is authored low→high reversed       |
| `pow:N`       | `lerp(range[0], range[1], pow(v, N))` (`N` is a literal)       |
| `bipolar`     | `range = [-x, +x]`; `v` maps 0..1 across; dead zone in caller  |

## 7. Knob mappings

Full bank/CC table is in [`MFT-MAPPINGS.md`](./MFT-MAPPINGS.md). Summary:

- **Bank 1 — "Performance"**: scroll, auto-scroll, master vol, mod amount, the four headline params (visual jagginess, LPF cutoff, distortion, reverb wet), jitter+stutter+master pitch, and the four macros.
- **Bank 2 — "Detail"**: granular sub-controls for visual noise field, LPF resonance, delay, reverb decay, jitter frequency, reverse probability, stutter max skip.

CCs are the MFT's default firmware mapping (knob index = CC number). Switch CCs use the same knob index but on a different MIDI channel (channel 2 in default firmware). Confirm against MFT Utility before final binding.

## 8. Macros

Four curated macros, each defined as a `targets` array + a `compute(v)` function in `macros.js`. The four:

- **M1 — Intensity** (recreates the original `normInt` behavior on a single knob).
- **M2 — Decay** (haze and dissolve: lower jagginess, heavy LPF, full reverb, drop volume slightly, no distortion).
- **M3 — Aggression** (push to chaos: full distortion + jitter + stutter + reverse, drop LPF).
- **M4 — Hush** (calm to silence: drop volume, jagginess, all glitch params; open LPF).

Effect tables are in `MFT-MAPPINGS.md`.

### Behavior rules

- **Macros write only on knob movement.** Moving a macro invokes `compute(v)` once and writes to its targets. A macro sitting at any value does nothing per frame; you can leave it at 0.5 and freely tweak granular knobs.
- **Most-recent-touch wins.** No locking, no priority. The `manual` slot is single-valued.
- **Press → snap to 0.** Macro switch CC press calls `compute(0)` and echoes the macro knob's LED ring back to 0. Functionally identical to manually rotating to zero, but instant.

## 9. Autonomous engine (modulation source)

Lives in `engine.js`. Re-creates the original sketch's `normInt` source (sine + Perlin blend with 1000-frame fade-in).

```js
const ENGINE = (() => {
  let active = false;
  let startFrame = 0;
  let lastTick = { normInt: 0, sine: 0, perlin: 0 };

  function activate()   { active = true; startFrame = frameCount; }
  function deactivate() { active = false; lastTick = { normInt: 0, sine: 0, perlin: 0 }; }
  function tick() {
    if (!active) return lastTick;
    const f = frameCount - startFrame;
    const sineWave = sin(f * 0.0005 - HALF_PI);
    const perlinNoise = noise(f * 0.005) * 2 - 1;
    const noiseLevel = map(constrain(f, 0, 1000), 0, 1000, 0, 0.05);
    const combined = lerp(sineWave, perlinNoise, noiseLevel);
    const normInt = map(combined, -1, 1, 0, 1);
    lastTick = { normInt, sine: sineWave, perlin: perlinNoise };
    return lastTick;
  }

  return { activate, deactivate, tick, isActive: () => active };
})();
```

### Activation

The Mod Amount knob's switch CC press toggles `ENGINE.active`. Each activation resets `startFrame = frameCount`, so the 1000-frame fade-in restarts cleanly each time the engine turns on. The press LED on the knob lights while active.

### Engine-aware params

Only the params the original `normInt` drove get an `engineFn`:

| Param               | engineFn(e) returns              |
|---------------------|----------------------------------|
| Visual Jagginess    | `e.normInt`                      |
| LPF Cutoff          | `e.normInt`                      |
| Distortion          | `e.normInt`                      |
| Reverb Wet          | `e.normInt`                      |
| Jitter Amount       | `e.normInt > 0.15 ? e.normInt : 0` |
| Stutter Probability | `e.normInt > 0.55 ? 1 : 0`       |
| Reverse Probability | `e.normInt > 0.65 ? 1 : 0`       |

The engineFn returns the normalized 0..1 source value; the param's `curve` shapes it once via `mappedValue`. (Earlier drafts of this table had `pow(e.normInt, 0.8)` for Distortion and `pow(e.normInt, 2.0)` for Reverb Wet, which double-shaped against the params' `pow:0.8` and `pow:2.0` curves — fixed here.)

Other params have no `engineFn` and aren't modulated.

### Modulation pass

Once per frame, after MIDI events, before `applyAll`:

```js
function modulationPass() {
  const m = PARAMS.byName('modAmount').manual;  // 0..1
  if (m <= 0 || !ENGINE.isActive()) {
    for (const p of PARAMS.all()) p.value = p.manual;
    return;
  }
  const e = ENGINE.tick();
  for (const p of PARAMS.all()) {
    p.value = p.engineFn ? lerp(p.manual, p.engineFn(e), m) : p.manual;
  }
}
```

- `m = 0` or engine off → `value = manual`. Pure manual.
- `m = 1`, engine active → `value = engineFn(e)` for engine-aware params.
- `0 < m < 1` → operator-and-engine duet.

LED echoes always reflect `manual`, never `value`. The Mod Amount knob's own LED ring stays where the operator put it; the engine's effect is invisible to the controller surface, audible/visible only in the audio/visual outputs.

## 10. Scroll & auto-scroll

### Scroll Position knob (CC 0, absolute)

Treated as a position-mode knob. Operator sets it; sketch echoes back when auto-scroll moves it.

- **Knob → scroll**: `targetScroll = (raw / 127) * (totalPoemHeight - height)`.
- **Sketch → knob**: when auto-scroll moves `targetScroll`, send CC 0 with `round((targetScroll / (totalPoemHeight - height)) * 127)`.
- **Press**: `targetScroll = 0` and echo CC 0 = 0.

### Auto-Scroll knob (CC 1, bipolar with click)

- **Normalization**: `v = (raw - 64) / 63` → −1.0 .. +1.0. Dead zone `|v| < 0.05`.
- **Active velocity**: `pixelsPerFrame = v * MAX_AUTO_SPEED`, with `MAX_AUTO_SPEED = 10` as a starting feel (tuneable).
- **Press**: toggles auto-scroll on/off. The press CC's LED indicator lights when on.

### Per-frame interaction order

```
1. MIDI input events → PARAMS / macros / switches
2. If auto-scroll on:
     targetScroll += velocity
     targetScroll = constrain(targetScroll, 0, totalPoemHeight - height)
     queue LED echo for scroll position
3. currentScroll = lerp(currentScroll, targetScroll, 0.1)   // existing visual smoothing
4. modulationPass()
5. PARAMS.applyAll()                                          // audio + visual outputs touched
6. drawSegments()
7. flushLedQueue (≥30ms throttled per CC)
```

Step 1 before step 2 means operator input wins on the same frame; auto-scroll resumes from there next frame. No fight between operator hand and auto-scroll.

### Fallback for position-mode mismatch

If the MFT firmware doesn't honor host writes to position CCs in the way described above, switch the position knob to delta/encoder mode in the MFT Utility. The sketch then treats incoming CC 0 as relative ticks (`+1` / `-1` from a center detent) and never has to re-sync the knob's internal state. To be discovered in first rehearsal; documented in `MFT-MAPPINGS.md` if needed.

## 11. Bidirectional MIDI & LED feedback

### When echoes are sent

The sketch echoes a CC back to the MFT whenever:

1. A macro has changed a granular param's `manual` (so the granular knob's LED follows the macro).
2. Auto-scroll has moved `targetScroll` (so the scroll-position LED ring tracks the moving viewport).
3. A switch state has been toggled programmatically (auto-scroll on/off, mute, engine active).
4. A macro press has snapped a macro to 0 (echo the macro knob ring + targets).
5. On reconnect: a full-state sync pass echoes every param's current `manual` and every switch's current state.

Note: the autonomous engine modulates `value` but never touches `manual`, so engine activity is *not* echoed to LEDs. The controller surface always reflects the operator's set state, never the engine's contribution.

### Echo-loop avoidance

- Track `lastSentToLed` per knob. If incoming CC raw equals `lastSentToLed`, drop it as an echo. Operator turns send increments; they almost never land exactly on a value we just sent.
- 30 ms minimum between consecutive outbound echoes to the same CC. Prevents auto-scroll from spamming the MFT at 60 Hz; ~33 Hz max is plenty for visual smoothness.

### Switch-CC LED states

| Knob              | Lit when                       |
|-------------------|--------------------------------|
| Auto-Scroll       | auto-scroll is active          |
| Master Volume     | muted (red)                    |
| Mod Amount        | engine is active               |
| Macro M1–M4       | brief flash on press only      |

## 12. Startup flow

```
Page load
  └─ p5.preload() → loadStrings, loadSound
  └─ p5.setup()   → audio chain wired, params init, canvas, draw loop running
                  → text appears static (Visual Jagginess = 0)
                  → audio loaded but NOT started
  └─ UI.showBegin()  →  centered "Click to begin" overlay

Operator clicks Begin
  └─ userStartAudio() (resolves AudioContext)
  └─ navigator.requestMIDIAccess({sysex: false})
       │
       ├─ Granted, MFT found:
       │     • Bind input + output
       │     • Master Volume default → 0 (silent start)
       │     • Send full-state LED sync pass
       │     • Hide Begin overlay
       │     • poemAudio.loop()
       │
       ├─ Granted, no MFT match:
       │     • UI.showPicker(inputs, outputs)
       │     • Operator picks (or "Skip")
       │     • If picked: bind + sync LEDs + Master Volume default → 0
       │     • If skipped: Master Volume default → 0.5 (audible for keyboard-only mode)
       │     • poemAudio.loop()
       │
       └─ Denied / unavailable:
             • Master Volume default → 0.5
             • Show "MIDI unavailable — running keyboard-only" briefly
             • poemAudio.loop()
```

## 13. UI overlays

- **Begin overlay** — centered, full-screen, single button. Dismissed on click.
- **Device picker** — only on auto-detect failure. Two `<select>` lists (inputs, outputs), Continue and Skip buttons. Reachable later via debug overlay.
- **Debug overlay** — toggled with `d` key. Bottom-left anchored, low opacity. Shows MIDI bind status, all params (manual / mapped / live value), all macros, last ~20 MIDI events, FPS, and a "Reopen device picker" link.
- **Disconnect indicator** — small red dot, bottom-right corner. Visible only when MIDI was bound but is now disconnected. Discreet enough to ignore from the audience side.

The original sketch's mute button + volume slider div are removed in this variant.

## 14. Disconnect / reconnect handling

- `MIDIAccess.onstatechange` listens for device events.
- On disconnect of bound device: show red dot. Manual values, audio, visuals all continue at last state.
- On reconnect of matching device: re-bind, send full-state LED sync pass, hide red dot.

## 15. Testing

### Automated (`tests.js` loaded by `test.html`)

Pure-function assertions, no framework:

1. Curve mappings: each curve type at v=0, v=0.5, v=1 returns expected envelope.
2. Macro target computations: M1–M4 at v=0, 0.5, 1 produce values matching `MFT-MAPPINGS.md`.
3. `setParam` writes to `manual`, leaves `value` until next `modulationPass`.
4. `modulationPass` at modAmount=0: `value = manual` for all params.
5. `modulationPass` at modAmount=1, engine active: `value = engineFn(e)` for engine-aware params; `value = manual` otherwise.
6. `ENGINE.activate()` resets `startFrame`; first `tick()` after activation produces normInt ≈ 0.
7. Bipolar normalization: raw 64 → ≈0; raw 0 → −1.0; raw 127 → +1.0; dead zone honored.
8. LED-echo throttle: two queued echoes for the same CC within 30 ms — second is dropped.

Failures log to console with red text. Run by opening `test.html`.

### Manual rehearsal checklist

Captured in `MFT-MAPPINGS.md` (or split out into `REHEARSAL.md` if it grows):

1. Auto-detect on connect (no picker shown).
2. Each granular knob produces the labeled effect.
3. Macros snap granular LED rings into formation when turned.
4. Auto-scroll moves the scroll-position LED ring without hand-fighting on grab.
5. Mod Amount = 0.5, engine active → operator/engine duet feel.
6. Mod Amount press toggles engine cleanly (no audio clicks/pops).
7. Master Volume defaults to 0 with MFT bound.
8. Disconnect → reconnect: red dot appears, then disappears; LEDs restore.
9. Refresh during performance → silent-start state cleanly.
10. Debug overlay (`d`) toggles responsively.

## 16. Open questions / future work

- **MAX_AUTO_SPEED** (auto-scroll velocity scaling) starts at 10 px/frame — adjust by feel in rehearsal.
- **MFT firmware mode for the position knob** — confirm in first rehearsal; may need delta-mode fallback (Section 10).
- **Master Pitch ± reset** — pressing the Master Pitch knob resets to 1.0× per `MFT-MAPPINGS.md`, but no equivalent reset for jitter / reverse / stutter knobs. If rehearsal reveals "stuck at extreme" issues, add reset-to-default presses for more knobs.
- **Macro snapping on press: should it write computed v=0 values, or *not write* (leave params alone)?** Currently spec says "write computed v=0 values." Could be revisited if it feels too heavy-handed in performance.
- **Preset / scene save** — out of scope for v1. If later useful, a single-keypress "snapshot all manual values" could write to localStorage.
