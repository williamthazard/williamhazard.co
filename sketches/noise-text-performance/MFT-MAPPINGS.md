# MFT Mappings — Noise Text (Performance)

Reference for the Midi Fighter Twister layout used to perform the `noise-text-performance` sketch. The MFT has 4 banks of 16 knobs (4×4 grid), with a rotation CC and a switch CC per knob. We use **two banks**.

## CC numbering

By MFT default firmware (v04+):

- Rotation CCs: bank 1 = `0..15`, bank 2 = `16..31`, bank 3 = `32..47`, bank 4 = `48..63`.
- Switch CCs: same range, but on a different MIDI channel (channel 2 in defaults; rotation is channel 1). Confirm against the MFT Utility before final wiring.

The CC ↔ parameter binding lives in `params.js`; everything below is the canonical layout.

---

## Bank 1 — "Performance"

The four knobs you'll touch most. The piece can be played using only this bank.

| Pos   | CC | Knob (rotation)      | Range              | Curve          | Default | Press action            |
|-------|----|----------------------|--------------------|----------------|---------|-------------------------|
| (1,1) | 0  | Scroll Position      | 0 → poem end       | linear         | 0       | jump to top             |
| (1,2) | 1  | Auto-Scroll Velocity | −1 .. +1 (centered)| bipolar linear | center  | toggle auto-scroll      |
| (1,3) | 2  | Master Volume        | 0..1               | pow:2.0        | 0 (MFT bound) / 0.5 (no MIDI) | mute toggle |
| (1,4) | 3  | Modulation Amount    | 0..1               | linear         | 0       | toggle engine on/off    |
| (2,1) | 4  | Visual Jagginess     | 0..225             | pow:3.2        | 0       | snap to 0               |
| (2,2) | 5  | LPF Cutoff           | 20000 → 300 Hz     | exp (inverted) | 0       | —                       |
| (2,3) | 6  | Distortion           | 0..0.95            | pow:0.8        | 0       | —                       |
| (2,4) | 7  | Reverb Wet           | 0..0.88            | pow:2.0        | 0       | —                       |
| (3,1) | 8  | Jitter Amount        | 0..0.45            | linear         | 0       | —                       |
| (3,2) | 9  | Stutter Probability  | 0..0.04 / frame    | linear         | 0       | —                       |
| (3,3) | 10 | Master Pitch         | 0.5 .. 2.0×        | exp around 1.0 | 1.0     | reset to 1.0            |
| (3,4) | 11 | (free)               |                    |                |         |                         |
| (4,1) | 12 | M1 — Intensity       | 0..1               | linear         | 0       | snap macro to 0         |
| (4,2) | 13 | M2 — Decay           | 0..1               | linear         | 0       | snap macro to 0         |
| (4,3) | 14 | M3 — Aggression      | 0..1               | linear         | 0       | snap macro to 0         |
| (4,4) | 15 | M4 — Hush            | 0..1               | linear         | 0       | snap macro to 0         |

---

## Bank 2 — "Detail"

Granular sub-controls. Reach for these when you want detail.

| Pos   | CC  | Knob (rotation)          | Range            | Curve  | Default  | Press action |
|-------|-----|--------------------------|------------------|--------|----------|--------------|
| (1,1) | 16  | Visual Spatial Frequency | 0.05 .. 0.4      | linear | 0.18     | reset        |
| (1,2) | 17  | Visual Time Speed        | 0.005 .. 0.2     | exp    | 0.05     | reset        |
| (1,3) | 18  | Visual Flow Speed        | 0.0 .. 0.08      | linear | 0.02     | reset        |
| (1,4) | 19  | Delay Wet                | 0..1             | pow:2  | 0        | —            |
| (2,1) | 20  | LPF Resonance            | 0.001 .. 30      | exp    | 0.001    | —            |
| (2,2) | 21  | Delay Time               | 0.1 .. 15 s      | exp    | ~1.5s    | —            |
| (2,3) | 22  | Delay Feedback           | 0..0.85          | linear | 0        | —            |
| (2,4) | 23  | Reverb Decay             | 0.5 .. 6 s       | linear | 2        | —            |
| (3,1) | 24  | Jitter Frequency         | 0.1 .. 3.0       | exp    | 0.8      | —            |
| (3,2) | 25  | Reverse Probability      | 0..0.06 / frame  | linear | 0        | —            |
| (3,3) | 26  | Stutter Max Skip         | 0.05 .. 2.0 s    | linear | 0.75     | —            |
| (3,4) | 27  | Preserve                 | 0..1             | linear | 0        | —            |
| (4,1) | 28  | Fbk HPF                  | 20 .. 800 Hz     | exp    | 20 Hz    | —            |
| (4,2) | 29  | Fbk Noise                | 0..0.5           | pow:2  | 0        | —            |
| (4,3) | 30  | Fbk Sine                 | 0..0.5           | pow:2  | 0        | —            |
| (4,4) | 31  | Fbk Sine Hz              | 40 .. 1200 Hz    | exp    | ~110 Hz  | —            |

---

## Bank 3 — "Live Mic"

The mic processing chain. Layout aligns the delay/feedback patchcord with Bank 2 so when the debug overlay shows banks side-by-side, analogous controls (Delay Wet, Delay Time, Delay Fbk, Reverb Decay, Preserve, Fbk HPF/Noise/Sine/Sine Hz) line up in the same column on screen.

| Pos   | CC  | Knob (rotation)          | Range            | Curve  | Default                | Press action      |
|-------|-----|--------------------------|------------------|--------|------------------------|-------------------|
| (1,1) | 32  | Mic Volume (input gate)  | 0..1             | pow:2  | 0                      | mic mute toggle   |
| (1,2) | 33  | Mic Gain (pre-amp)       | 0..4×            | pow:2  | 0.25×                  | —                 |
| (1,3) | 34  | Mic LPF Cutoff           | 20000..300 Hz    | expInv | 20 kHz                 | —                 |
| (1,4) | 35  | Mic Delay Wet            | 0..1             | pow:2  | 0                      | —                 |
| (2,1) | 36  | Mic Distortion           | 0..0.95          | pow:0.8| 0                      | —                 |
| (2,2) | 37  | Mic Delay Time           | 0.1 .. 15 s      | exp    | ~1.5s                  | —                 |
| (2,3) | 38  | Mic Feedback Level       | 0..0.95          | pow:2  | 0                      | —                 |
| (2,4) | 39  | Mic Reverb Decay         | 0.5 .. 6 s       | linear | ~2s                    | —                 |
| (3,1) | 40  | Mic Reverb Wet           | 0..0.88          | pow:2  | 0                      | —                 |
| (3,2) | 41  | Mic Fbk Balance          | −1 .. +1         | bipolar| 0 (center)             | —                 |
| (3,3) | 42  | (free)                   |                  |        |                        |                   |
| (3,4) | 43  | Mic Preserve             | 0..1             | linear | 0                      | —                 |
| (4,1) | 44  | Mic Fbk HPF              | 20 .. 800 Hz     | exp    | 20 Hz                  | —                 |
| (4,2) | 45  | Mic Fbk Noise            | 0..0.5           | pow:2  | 0                      | —                 |
| (4,3) | 46  | Mic Fbk Sine             | 0..0.5           | pow:2  | 0                      | —                 |
| (4,4) | 47  | Mic Fbk Sine Hz          | 40 .. 1200 Hz    | exp    | ~110 Hz                | —                 |

---

## Macros

Macro knobs write to several params at once. **Macros only write on knob movement** — sitting at any value does nothing. So you can move a macro to set a "scene," then freely tweak granular knobs without the macro fighting you. Touching the macro again overwrites the params it controls. **Most-recent-touch wins.**

The "press = snap to 0" action zeroes the macro knob *and* writes its v=0 mapping (so it acts like releasing a chord cleanly).

### M1 — Intensity (recreates the original noise behavior)

Each value is the unshaped 0..1 input; the param's `curve` does the shaping in `mappedValue` (e.g. distortion's `pow:0.8` curve, reverb wet's `pow:2.0` curve). Don't pre-shape in the macro — the curve gets applied once when the audio chain reads `value`.

| Param               | Mapping from macro v |
|---------------------|----------------------|
| Visual Jagginess    | `v`                  |
| LPF Cutoff          | `v`                  |
| Distortion          | `v`                  |
| Reverb Wet          | `v`                  |
| Jitter Amount       | `v` if `v > 0.15`, else `0` |
| Stutter Probability | full if `v > 0.55`, else `0` |

### M2 — Decay (haze and dissolve)

| Param            | Mapping from macro v |
|------------------|----------------------|
| Visual Jagginess | `v * 0.3`            |
| LPF Cutoff       | `v` (heavy filtering)|
| Reverb Wet       | `v`                  |
| Distortion       | `0`                  |
| Master Volume    | `1 − v * 0.4`        |

### M3 — Aggression (push to chaos)

| Param               | Mapping from macro v |
|---------------------|----------------------|
| Distortion          | `v`                  |
| Jitter Amount       | `v`                  |
| Stutter Probability | `v`                  |
| Reverse Probability | `v`                  |
| LPF Cutoff          | `v * 0.6`            |

### M4 — Hush (calm to silence)

| Param               | Mapping from macro v |
|---------------------|----------------------|
| Master Volume       | `1 − v`              |
| Visual Jagginess    | `1 − v`              |
| LPF Cutoff          | `1 − v` (open up)    |
| Jitter Amount       | `1 − v`              |
| Stutter Probability | `1 − v`              |
| Reverb Wet          | `1 − v`              |
| Distortion          | `1 − v`              |

---

## LED feedback

The MFT receives the same CC numbers it sends, on the rotation channel, to drive its indicator LEDs. The sketch echoes back to the MFT whenever:

1. A macro changes a granular param's value (so the granular knob's LED follows the macro).
2. The autonomous modulation engine moves a param (so the LED tracks the engine while it's active).
3. Auto-scroll is engaged and moving the scroll position (so the Scroll Position LED ring follows the moving viewport).

Echoes are throttled per-knob to one update every ~30 ms to avoid feedback storms.

## Press-CC LED states

Switch CCs control the LED color/state ring on the same knob (per MFT switch firmware). The sketch sends switch-CC values back to indicate:

- Auto-Scroll knob: lit while auto-scroll is active.
- Master Volume knob: lit (red) while muted.
- Modulation Amount knob: lit while the engine is active.
- Macro knobs: brief flash on press (visual confirmation of "snap to 0").
