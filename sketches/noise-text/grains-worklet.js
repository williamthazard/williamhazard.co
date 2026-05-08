// grains-worklet.js — 16-voice granular synthesis from a circular mic buffer.
// Reads at varied pitch ratios + ptr offsets to produce a Carter's Delay style cloud.

const TAP_RATES = [1/4, 2/6, 3/8, 4/10, 1/2, 2/3, 3/4, 4/5, 1, 5/4, 4/3, 3/2, 2/1, 10/4, 8/3, 6/2];
// Scrambled deterministic order — different tap layout from SuperCollider's
// Array.scramble (random) but stable so the experience is reproducible.
const TAP_ORDER = [8, 12, 4, 14, 1, 9, 5, 11, 0, 13, 3, 10, 7, 2, 15, 6];

class CartersGrainsProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const params = [
      { name: 'densityScale',   defaultValue: 1, minValue: 0.05, maxValue: 20, automationRate: 'k-rate' },
      { name: 'durScale',       defaultValue: 1, minValue: 0.1,  maxValue: 5,  automationRate: 'k-rate' },
      { name: 'beatDur',        defaultValue: 0.5, minValue: 0.05, maxValue: 5, automationRate: 'k-rate' },
      // Per-voice gain (a-rate so the main thread can modulate via amp LFOs).
    ];
    for (let i = 0; i < 16; i++) {
      params.push({ name: `voice${i}Amp`, defaultValue: 1, minValue: 0, maxValue: 4, automationRate: 'a-rate' });
    }
    return params;
  }

  constructor() {
    super();
    const bufferSeconds = 30;
    this.bufferSize = Math.floor(sampleRate * bufferSeconds);
    this.buffer = new Float32Array(this.bufferSize);
    this.writePtr = 0;
    this.sampleCounter = 0; // monotonic, never wraps

    this.voices = [];
    for (let i = 0; i < 16; i++) {
      const rateIdx = TAP_ORDER[i];
      this.voices.push({
        rate: TAP_RATES[rateIdx],
        // ptrSampleDelay: SuperCarter uses sampleRate * beatDur * (i+1) * 16 — much longer than seems needed.
        // We use sampleRate * beatDur * (i+1) * 4 — shorter so we fit in a 30s buffer for typical BPMs.
        // At beatDur=0.5s and i=15, that's 30s exactly; we cap at bufferSize - safety margin.
        ptrIndex: i, // (i+1) factor below
        // Per-grain state.
        grainPhase: 0,         // sample-accurate phase within current grain (0..grainLengthSamples)
        grainLength: 0,        // total samples in current grain
        grainReadStart: 0,     // float position in buffer when grain started
        nextGrainAt: 0,        // sampleCounter value when next grain should start
      });
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    // ONE output with 16 channels — outputs[0][v] is voice v's channel.
    // (Multi-output config didn't deliver audio reliably in Chrome.)
    const out = outputs[0];
    if (!out || out.length < 16) return true;

    const numSamples = out[0].length;
    const inputCh = (input && input.length > 0) ? input[0] : null;

    const densityScale = parameters.densityScale[0];
    const durScale = parameters.durScale[0];
    const beatDur = parameters.beatDur[0];

    const sr = sampleRate;
    const buf = this.buffer;
    const bufLen = this.bufferSize;

    for (let s = 0; s < numSamples; s++) {
      // 1. Write input into circular buffer.
      buf[this.writePtr] = inputCh ? inputCh[s] : 0;

      // 2. For each voice, generate output sample.
      for (let v = 0; v < 16; v++) {
        const voice = this.voices[v];
        const ampParam = parameters[`voice${v}Amp`];
        const voiceAmp = ampParam.length > 1 ? ampParam[s] : ampParam[0];

        // Spawn a new grain if it's time.
        if (this.sampleCounter >= voice.nextGrainAt) {
          // ptrSampleDelay scales with beatDur (so BPM affects buffer-read distance).
          // Each voice has a different tap distance: (ptrIndex + 1) × beatDur × 4 seconds.
          const ptrSamples = Math.floor(sr * beatDur * (voice.ptrIndex + 1) * 4);
          const cappedPtr = Math.min(ptrSamples, bufLen - Math.floor(sr * 0.1)); // 100ms safety margin
          // Random jitter on read position: ±25% of the base ptrSamples.
          const jitter = (Math.random() - 0.5) * 2 * cappedPtr * 0.25;
          const readStart = (this.writePtr - cappedPtr + jitter + bufLen * 2) % bufLen;
          // Grain duration — matches SuperCarter's `beatDur * (i+1)` formula:
          // 0.5s..8s at beatDur=0.5, scaled by durScale. Capped at 15s so we
          // can't read past the buffer wrap.
          const baseGrainSec = Math.min(15, beatDur * (voice.ptrIndex + 1) * durScale);
          voice.grainLength = Math.max(64, Math.floor(baseGrainSec * sr));
          voice.grainPhase = 0;
          voice.grainReadStart = readStart;
          // Schedule next grain. density (grains/sec) = densityScale / baseGrainSec.
          // So inter-grain spacing = baseGrainSec / densityScale samples × sr.
          // Allow some random jitter on density.
          const jitterDens = 0.5 + Math.random();
          const samplesUntilNext = Math.max(1, Math.floor((baseGrainSec * sr / densityScale) * jitterDens));
          voice.nextGrainAt = this.sampleCounter + samplesUntilNext;
        }

        // Render grain sample (if grain is active).
        let voiceOut = 0;
        if (voice.grainPhase < voice.grainLength) {
          const readPos = voice.grainReadStart + voice.grainPhase * voice.rate;
          // Linear interpolation between adjacent samples.
          const intPart = Math.floor(readPos);
          const frac = readPos - intPart;
          const idx0 = ((intPart % bufLen) + bufLen) % bufLen;
          const idx1 = (idx0 + 1) % bufLen;
          const sample = buf[idx0] * (1 - frac) + buf[idx1] * frac;
          // Hann window envelope.
          const env = 0.5 * (1 - Math.cos(2 * Math.PI * voice.grainPhase / voice.grainLength));
          voiceOut = sample * env * voiceAmp;
          voice.grainPhase++;
        }

        out[v][s] = voiceOut;
      }

      // 3. Advance pointers.
      this.writePtr = (this.writePtr + 1) % bufLen;
      this.sampleCounter++;
    }

    return true;
  }
}

registerProcessor('carters-grains', CartersGrainsProcessor);
