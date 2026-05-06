// delay.js — Carter-flavored multi-tap delay + feedback patchcord factory.
// Each call to Delay.create(ctx) builds an independent instance.
// Reverb is NOT included; each chain handles its own reverb tail.
const Delay = (() => {

  // Tap layout (deterministic but varied)
  const TAP_COUNT = 4;
  const TAP_SCRAMBLE = [0.5, 1.0, 1.7, 2.5];
  const TAP_PAN_LFO_HZ    = [0.13, 0.21, 0.31, 0.17];
  const TAP_CUTOFF_LFO_HZ = [0.07, 0.18, 0.11, 0.23];
  const TAP_PITCH_RATIO = [1.0, 0.5, 1.5, 2.0];
  // Tap 1 unison, tap 2 octave down, tap 3 perfect fifth up, tap 4 octave up.
  // Combined with TAP_SCRAMBLE delay times, gives a Carter-style cloud where each
  // echo is at a different point in the buffer history AND a different pitch.
  const MAX_DELAY_SECONDS = 20.0;

  function makeSoftClipCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const k = 1 + amount * 50;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  function makePinkNoiseBuffer(ctx) {
    const seconds = 5;
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function buildPitchShifter(ctx, pitchRatio) {
    const input  = ctx.createGain();
    const output = ctx.createGain();

    // Unison: pure passthrough, no scheduling needed.
    if (Math.abs(pitchRatio - 1.0) < 0.001) {
      input.connect(output);
      return { input, output };
    }

    const dA = ctx.createDelay(1.0);
    const dB = ctx.createDelay(1.0);
    const gA = ctx.createGain();
    const gB = ctx.createGain();

    input.connect(dA);
    input.connect(dB);
    dA.connect(gA);
    dB.connect(gB);
    gA.connect(output);
    gB.connect(output);

    gA.gain.value = 0;
    gB.gain.value = 0;

    const windowSec     = 0.1;                               // 100 ms window
    const slideRate     = 1 - pitchRatio;                    // s of delay change per s real time
    const slideDuration = windowSec / Math.abs(slideRate);   // s real time per window pass
    const startDelay    = slideRate >= 0 ? 0 : windowSec;
    const endDelay      = slideRate >= 0 ? windowSec : 0;
    // slideRate > 0 (R<1, pitch DOWN):  delay grows → reads older buffer → slower playback
    // slideRate < 0 (R>1, pitch UP):    delay shrinks → reads newer buffer → faster playback

    let scheduledUntil = ctx.currentTime;

    function scheduleCycles(numCycles) {
      let t = Math.max(scheduledUntil, ctx.currentTime + 0.05);
      for (let n = 0; n < numCycles; n++) {
        // Two delay lines, offset by half-window.
        [[dA, gA, 0], [dB, gB, 0.5]].forEach(([d, g, phaseOffset]) => {
          const startT = t + phaseOffset * slideDuration;
          const endT   = startT + slideDuration;
          const midT   = (startT + endT) / 2;

          // Delay-time slide (linear).
          d.delayTime.setValueAtTime(startDelay, startT);
          d.delayTime.linearRampToValueAtTime(endDelay, endT);

          // Crossfade gain: 0 → 1 → 0 over the window (triangular).
          g.gain.setValueAtTime(0, startT);
          g.gain.linearRampToValueAtTime(1, midT);
          g.gain.linearRampToValueAtTime(0, endT);
        });
        t += slideDuration;
      }
      scheduledUntil = t;
    }

    // Initial schedule — enough buffer ahead for several seconds of audio.
    scheduleCycles(40);

    // Re-schedule periodically to stay ahead.
    setInterval(() => {
      if (ctx.currentTime > scheduledUntil - 1.0) scheduleCycles(20);
    }, 1000);

    return { input, output };
  }

  // Build one independent delay subsystem instance.
  function create(ctx) {
    // Entry/exit points.
    const input  = ctx.createGain();      // upstream connects here
    const output = ctx.createGain();      // downstream connects to this
    input.gain.value = 1;
    output.gain.value = 1;

    // Dry passthru and dry/wet sum (output goes to .output).
    const dryPassthru = ctx.createGain(); dryPassthru.gain.value = 1;
    const dryWetSum = ctx.createGain(); dryWetSum.gain.value = 1;
    input.connect(dryPassthru);
    dryPassthru.connect(dryWetSum);

    // Feedback / delay-input bus.
    const delayInputBus = ctx.createGain(); delayInputBus.gain.value = 1;
    input.connect(delayInputBus);

    // Tap chain (4 taps).
    const tapsSumGain = ctx.createGain(); tapsSumGain.gain.value = 1;
    const tapDelay = [];
    const tapFilter = [];
    const tapPanner = [];
    const tapGain = [];
    const tapPanLfo = [];
    const tapPanLfoDepth = [];
    const tapCutoffLfo = [];
    const tapCutoffLfoDepth = [];
    const tapCutoffOffset = [];

    for (let i = 0; i < TAP_COUNT; i++) {
      const d = ctx.createDelay(MAX_DELAY_SECONDS);
      d.delayTime.value = 0.5 * TAP_SCRAMBLE[i];

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 5000;
      f.Q.value = 0.7;

      const cutoffOffset = ctx.createConstantSource();
      cutoffOffset.offset.value = 5000;
      cutoffOffset.connect(f.frequency);
      cutoffOffset.start();

      const cLfo = ctx.createOscillator();
      cLfo.type = 'triangle';
      cLfo.frequency.value = TAP_CUTOFF_LFO_HZ[i];
      const cLfoDepth = ctx.createGain();
      cLfoDepth.gain.value = 2500;
      cLfo.connect(cLfoDepth);
      cLfoDepth.connect(f.frequency);
      cLfo.start();

      const p = ctx.createStereoPanner();
      const pLfo = ctx.createOscillator();
      pLfo.type = 'triangle';
      pLfo.frequency.value = TAP_PAN_LFO_HZ[i];
      const pLfoDepth = ctx.createGain();
      pLfoDepth.gain.value = 0.7;
      pLfo.connect(pLfoDepth);
      pLfoDepth.connect(p.pan);
      pLfo.start();

      const g = ctx.createGain();
      g.gain.value = 1.0 / TAP_COUNT;

      const pitchShifter = buildPitchShifter(ctx, TAP_PITCH_RATIO[i]);
      delayInputBus.connect(d);
      d.connect(pitchShifter.input);
      pitchShifter.output.connect(f);
      f.connect(p);
      p.connect(g);
      g.connect(tapsSumGain);

      tapDelay.push(d);
      tapFilter.push(f);
      tapPanner.push(p);
      tapGain.push(g);
      tapPanLfo.push(pLfo);
      tapPanLfoDepth.push(pLfoDepth);
      tapCutoffLfo.push(cLfo);
      tapCutoffLfoDepth.push(cLfoDepth);
      tapCutoffOffset.push(cutoffOffset);
    }

    // Wet level (between tapsSum and dryWetSum).
    const delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0;
    tapsSumGain.connect(delayWetGain);
    delayWetGain.connect(dryWetSum);

    // Pink noise + sine for feedback injection.
    const pinkNoiseSource = ctx.createBufferSource();
    pinkNoiseSource.buffer = makePinkNoiseBuffer(ctx);
    pinkNoiseSource.loop = true;
    const pinkNoiseGain = ctx.createGain(); pinkNoiseGain.gain.value = 0;
    pinkNoiseSource.connect(pinkNoiseGain);

    const sineOscNode = ctx.createOscillator();
    sineOscNode.type = 'sine';
    sineOscNode.frequency.value = 110;
    const sineGain = ctx.createGain(); sineGain.gain.value = 0;
    sineOscNode.connect(sineGain);

    // Feedback patchcord.
    const fbkBalance = ctx.createStereoPanner();
    const fbkInjectionSum = ctx.createGain(); fbkInjectionSum.gain.value = 1;
    const fbkHpf = ctx.createBiquadFilter();
    fbkHpf.type = 'highpass';
    fbkHpf.frequency.value = 80;
    fbkHpf.Q.value = 0.7;
    const fbkSoftClip = ctx.createWaveShaper();
    fbkSoftClip.curve = makeSoftClipCurve(0.5);
    fbkSoftClip.oversample = '2x';
    const fbkGain = ctx.createGain(); fbkGain.gain.value = 0;
    const preserveGain = ctx.createGain(); preserveGain.gain.value = 0;

    tapsSumGain.connect(fbkBalance);
    fbkBalance.connect(fbkInjectionSum);
    pinkNoiseGain.connect(fbkInjectionSum);
    sineGain.connect(fbkInjectionSum);
    fbkInjectionSum.connect(fbkHpf);
    fbkHpf.connect(fbkSoftClip);
    fbkSoftClip.connect(fbkGain);
    fbkGain.connect(preserveGain);
    preserveGain.connect(delayInputBus);

    // Final exit.
    dryWetSum.connect(output);

    // Start oscillators / loops.
    pinkNoiseSource.start();
    sineOscNode.start();

    // ---- Setter API (for binding to PARAMS.byName(...).apply) ----
    return {
      input,
      output,
      setDelayWet:        (mapped) => { delayWetGain.gain.value = mapped; },
      setDelayTime:       (mapped) => {
        const now = ctx.currentTime;
        for (let i = 0; i < tapDelay.length; i++) {
          tapDelay[i].delayTime.setTargetAtTime(mapped * TAP_SCRAMBLE[i], now, 0.05);
        }
      },
      setPreserve:        (mapped) => { preserveGain.gain.value = mapped; },
      setFeedbackLevel:   (mapped) => { fbkGain.gain.value = mapped; },
      setFeedbackHpf:     (mapped) => { fbkHpf.frequency.value = mapped; },
      setFeedbackNoise:   (mapped) => { pinkNoiseGain.gain.value = mapped; },
      setFeedbackSine:    (mapped) => { sineGain.gain.value = mapped; },
      setFeedbackSineHz:  (mapped) => {
        const now = ctx.currentTime;
        sineOscNode.frequency.setTargetAtTime(mapped, now, 0.02);
      },
      setFeedbackBalance: (mapped) => { fbkBalance.pan.value = mapped; },
    };
  }

  return { create, makeSoftClipCurve, makePinkNoiseBuffer };
})();
