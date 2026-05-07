// audio.js — main-thread audio graph for Carter's Delay.
// 16-voice granular synthesis via AudioWorklet + per-voice LFOs + feedback patchcord.

const AUDIO = (() => {

  // ─── Helpers ──────────────────────────────────────────────────────────────

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

  function makeReverbImpulse(ctx, decaySeconds) {
    const sr = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sr * decaySeconds));
    const buffer = ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
      }
    }
    return buffer;
  }

  // ─── LFO frequency tables (deterministic per-voice rates) ─────────────────

  // LFOs are computed via Perlin noise() each frame (see updateLfos). Per-voice
  // variation comes from voice-index multiplication into the noise rate (matches
  // small-works' (j+1)(i+1)/80000 × frameCount formula).

  // ─── Module-scope node references ─────────────────────────────────────────

  let audioCtx = null;
  let micStream = null;
  let started = false;

  // Pre-FX chain
  let sourceNode        = null;
  let micMuteGate       = null; // source-level mic gate (setMicMuted)
  let micInputGain      = null; // micVol knob
  let preLpfNode        = null;
  let preDistNode       = null;
  let dryPassthru       = null;
  let inputAnalyser     = null; // reads post-preLpf, pre-delay (for viz)

  // Granular worklet
  let grainsWorkletNode = null;
  let delayInputBus     = null; // upstream of the worklet (also receives feedback)

  // Per-voice processing chains (16 each)
  const voiceFilters    = [];
  const voicePanners    = [];
  const voiceAmpGains   = [];
  const voiceAnalysers  = [];

  // Per-voice LFOs (16 each)
  // Per-voice cached LFO outputs (pan, amp, cutoff, res — all 0..1 from Perlin).
  // Populated by updateLfos() each frame; read by visualization + audio bindings.
  let voiceLfoCache     = [];

  // Mix + reverb
  let voicesSum         = null;
  let dryWetSum         = null;
  let reverbConvolver   = null;
  let reverbDryGain     = null;
  let reverbWetGain     = null;
  let lastReverbDecay   = -1;

  // Output
  let outputGainNode    = null;
  let outputMuteGate    = null; // output mute switch

  // Feedback patchcord
  let fbkBalance        = null;
  let fbkInjectionSum   = null;
  let fbkHpf            = null;
  let fbkSoftClip       = null;
  let fbkGain           = null;
  let preserveGain      = null;
  let pinkNoiseSource   = null;
  let pinkNoiseGain     = null;
  let sineOsc           = null;
  let sineGain          = null;

  // ─── start() ──────────────────────────────────────────────────────────────

  async function start() {
    if (started) return { ok: true };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { ok: false, reason: 'getUserMedia not supported' };
    }

    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (e) {
      return { ok: false, reason: 'permission denied or unavailable' };
    }

    audioCtx = (typeof getAudioContext === 'function') ? getAudioContext() : new AudioContext();

    // Load the granular worklet.
    await audioCtx.audioWorklet.addModule('grains-worklet.js');

    // ── Pre-FX chain ────────────────────────────────────────────────────────

    sourceNode = audioCtx.createMediaStreamSource(micStream);

    // Source-level mic mute gate — cuts fresh audio without clearing the delay buffer.
    micMuteGate = audioCtx.createGain();
    micMuteGate.gain.value = 1; // start open; setMicMuted controls this

    // micVol knob — operator-controlled input gain.
    micInputGain = audioCtx.createGain();
    micInputGain.gain.value = 0; // silent by default (micVol default = 0)

    // Pre-LPF (preLpf knob).
    preLpfNode = audioCtx.createBiquadFilter();
    preLpfNode.type = 'lowpass';
    preLpfNode.frequency.value = 20000;
    preLpfNode.Q.value = 0.5;

    // Pre-distortion (preDist knob).
    preDistNode = audioCtx.createWaveShaper();
    preDistNode.curve = makeSoftClipCurve(0);
    preDistNode.oversample = '2x';

    // Input analyser (visualisation of the clean mic signal).
    inputAnalyser = audioCtx.createAnalyser();
    inputAnalyser.fftSize = 1024;
    inputAnalyser.smoothingTimeConstant = 0.8;

    // Dry passthru — goes directly to dryWetSum.
    dryPassthru = audioCtx.createGain();
    dryPassthru.gain.value = 1;

    // dryWetSum — collects dry + wet (voices) before reverb.
    dryWetSum = audioCtx.createGain();
    dryWetSum.gain.value = 1;

    // Delay input bus — feeds the worklet (also receives feedback).
    delayInputBus = audioCtx.createGain();
    delayInputBus.gain.value = 1;

    // Wire pre-FX chain.
    sourceNode.connect(micMuteGate);
    micMuteGate.connect(micInputGain);
    micInputGain.connect(preLpfNode);
    preLpfNode.connect(preDistNode);
    preDistNode.connect(inputAnalyser);
    preDistNode.connect(dryPassthru);
    preDistNode.connect(delayInputBus);
    dryPassthru.connect(dryWetSum);

    // ── Granular worklet node ────────────────────────────────────────────────

    grainsWorkletNode = new AudioWorkletNode(audioCtx, 'carters-grains', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [16],
    });

    delayInputBus.connect(grainsWorkletNode);

    // Split the worklet's 16 channels into 16 separate routes, one per voice.
    const grainsSplitter = audioCtx.createChannelSplitter(16);
    grainsWorkletNode.connect(grainsSplitter);

    // ── Per-voice processing chains ──────────────────────────────────────────

    voicesSum = audioCtx.createGain();
    // Per-voice levels (with 0.3 baseline ampGain + Hann envelope avg ~0.5) +
    // 16-voice decorrelated sum already give grain-layer-vs-dry-passthru parity.
    // No extra boost needed; 4× boost was driving the feedback loop into noise.
    voicesSum.gain.value = 1;

    for (let v = 0; v < 16; v++) {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 5000;
      filter.Q.value = 0.7;

      const panner = audioCtx.createStereoPanner();

      const ampGain = audioCtx.createGain();
      ampGain.gain.value = 0.5; // audible baseline; LFO modulates from here

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;

      // Splitter channel v → filter → panner → ampGain → analyser → voicesSum
      grainsSplitter.connect(filter, v, 0);
      filter.connect(panner);
      panner.connect(ampGain);
      ampGain.connect(analyser);
      analyser.connect(voicesSum);

      voiceFilters.push(filter);
      voicePanners.push(panner);
      voiceAmpGains.push(ampGain);
      voiceAnalysers.push(analyser);
    }

    voicesSum.connect(dryWetSum);

    // ── Per-voice LFOs ───────────────────────────────────────────────────────
    // Driven by p5's Perlin noise() in updateLfos(), called every frame from
    // sketch.js's draw loop. Replaces audio-rate Oscillator+Gain LFOs because
    // Perlin's slowly-varying noise feels more organic (matches small-works).

    // Cache the most recent computed LFO output per voice for visualization.
    voiceLfoCache = new Array(16).fill(null).map(() => ({
      pan: 0, amp: 0.5, cutoff: 0.5, res: 0,
    }));

    // ── Feedback patchcord ───────────────────────────────────────────────────
    // voicesSum → fbkBalance → fbkInjectionSum (+ noise + sine) → fbkHpf
    //   → fbkSoftClip → fbkGain → preserveGain → delayInputBus

    fbkBalance = audioCtx.createStereoPanner();
    fbkBalance.pan.value = 0;

    fbkInjectionSum = audioCtx.createGain();
    fbkInjectionSum.gain.value = 1;

    // Pink noise source.
    pinkNoiseSource = audioCtx.createBufferSource();
    pinkNoiseSource.buffer = makePinkNoiseBuffer(audioCtx);
    pinkNoiseSource.loop = true;
    pinkNoiseGain = audioCtx.createGain();
    pinkNoiseGain.gain.value = 0;
    pinkNoiseSource.connect(pinkNoiseGain);

    // Sine oscillator.
    sineOsc = audioCtx.createOscillator();
    sineOsc.type = 'sine';
    sineOsc.frequency.value = 110;
    sineGain = audioCtx.createGain();
    sineGain.gain.value = 0;
    sineOsc.connect(sineGain);

    fbkHpf = audioCtx.createBiquadFilter();
    fbkHpf.type = 'highpass';
    fbkHpf.frequency.value = 80;
    fbkHpf.Q.value = 0.7;

    fbkSoftClip = audioCtx.createWaveShaper();
    fbkSoftClip.curve = makeSoftClipCurve(0.05); // gentle by default; user knob can go harsher
    fbkSoftClip.oversample = '2x';

    // Fixed LPF in the feedback path — rolls off the high-frequency content
    // that accumulates each round-trip from grain readout discontinuities and
    // softclip harmonics. Without this, even at modest feedback the loop
    // tends to "fizzle" into noise. Cutoff is permissive (4kHz) so the
    // recursive cloud still has presence and detail.
    const fbkLpf = audioCtx.createBiquadFilter();
    fbkLpf.type = 'lowpass';
    fbkLpf.frequency.value = 4000;
    fbkLpf.Q.value = 0.5;

    fbkGain = audioCtx.createGain();
    fbkGain.gain.value = 0;

    preserveGain = audioCtx.createGain();
    preserveGain.gain.value = 0;

    voicesSum.connect(fbkBalance);
    fbkBalance.connect(fbkInjectionSum);
    pinkNoiseGain.connect(fbkInjectionSum);
    sineGain.connect(fbkInjectionSum);
    fbkInjectionSum.connect(fbkHpf);
    fbkHpf.connect(fbkSoftClip);
    fbkSoftClip.connect(fbkLpf);
    fbkLpf.connect(fbkGain);
    fbkGain.connect(preserveGain);
    preserveGain.connect(delayInputBus);

    // ── Reverb tail ──────────────────────────────────────────────────────────

    reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = makeReverbImpulse(audioCtx, 2.0);

    reverbDryGain = audioCtx.createGain();
    reverbDryGain.gain.value = 1;

    reverbWetGain = audioCtx.createGain();
    reverbWetGain.gain.value = 0;

    dryWetSum.connect(reverbDryGain);
    dryWetSum.connect(reverbConvolver);
    reverbConvolver.connect(reverbWetGain);

    // ── Output ───────────────────────────────────────────────────────────────

    outputGainNode = audioCtx.createGain();
    outputGainNode.gain.value = 0; // masterVol default = 0

    outputMuteGate = audioCtx.createGain();
    outputMuteGate.gain.value = 1; // open; setOutputMuted controls this

    reverbDryGain.connect(outputGainNode);
    reverbWetGain.connect(outputGainNode);
    outputGainNode.connect(outputMuteGate);
    outputMuteGate.connect(audioCtx.destination);

    // ── Wire up params + start LFOs ─────────────────────────────────────────

    bindParams();
    startLfos();

    started = true;
    return { ok: true };
  }

  // ─── bindParams() ─────────────────────────────────────────────────────────

  function bindParams() {
    PARAMS.byName('micVol').apply = (m) => {
      if (micInputGain) micInputGain.gain.value = m;
    };
    PARAMS.byName('masterVol').apply = (m) => {
      if (outputGainNode) outputGainNode.gain.value = m;
    };
    PARAMS.byName('bpm').apply = (m) => {
      if (grainsWorkletNode) {
        // beatDur = 60 / bpm
        grainsWorkletNode.parameters.get('beatDur').setTargetAtTime(60 / m, audioCtx.currentTime, 0.05);
      }
    };
    PARAMS.byName('modAmount').apply = (m) => {
      // modAmount is available for future use (e.g. depth multiplier); no-op for v1.
    };
    PARAMS.byName('preLpf').apply = (m) => {
      if (preLpfNode) preLpfNode.frequency.value = m;
    };
    PARAMS.byName('preDist').apply = (m) => {
      if (preDistNode) preDistNode.curve = makeSoftClipCurve(m);
    };
    PARAMS.byName('reverbWet').apply = (m) => {
      if (reverbWetGain) reverbWetGain.gain.value = m;
      if (reverbDryGain) reverbDryGain.gain.value = 1 - m;
    };
    PARAMS.byName('reverbDecay').apply = (m) => {
      if (Math.abs(m - lastReverbDecay) > 0.1) {
        if (reverbConvolver) reverbConvolver.buffer = makeReverbImpulse(audioCtx, m);
        lastReverbDecay = m;
      }
    };
    PARAMS.byName('density').apply = (m) => {
      if (grainsWorkletNode) {
        grainsWorkletNode.parameters.get('densityScale').setTargetAtTime(m, audioCtx.currentTime, 0.1);
      }
    };
    PARAMS.byName('grainDurScale').apply = (m) => {
      if (grainsWorkletNode) {
        grainsWorkletNode.parameters.get('durScale').setTargetAtTime(m, audioCtx.currentTime, 0.1);
      }
    };
    // cutoffBase, resonance, panRange, ampRange, lfoSpeed, lfoVariance —
    // all consumed by updateLfos() each frame (read directly from PARAMS).
    PARAMS.byName('cutoffBase').apply  = () => {};
    PARAMS.byName('resonance').apply   = () => {};
    PARAMS.byName('panRange').apply    = () => {};
    PARAMS.byName('ampRange').apply    = () => {};
    PARAMS.byName('lfoSpeed').apply    = () => {};
    PARAMS.byName('lfoVariance').apply = () => {};
    PARAMS.byName('fbkLevel').apply = (m) => {
      if (fbkGain) fbkGain.gain.value = m;
    };
    PARAMS.byName('preserve').apply = (m) => {
      if (preserveGain) preserveGain.gain.value = m;
    };
    PARAMS.byName('fbkHpf').apply = (m) => {
      if (fbkHpf) fbkHpf.frequency.value = m;
    };
    PARAMS.byName('fbkBalance').apply = (m) => {
      if (fbkBalance) fbkBalance.pan.value = m;
    };
    PARAMS.byName('fbkNoise').apply = (m) => {
      if (pinkNoiseGain) pinkNoiseGain.gain.value = m;
    };
    PARAMS.byName('fbkSine').apply = (m) => {
      if (sineGain) sineGain.gain.value = m;
    };
    PARAMS.byName('fbkSineHz').apply = (m) => {
      if (sineOsc) sineOsc.frequency.setTargetAtTime(m, audioCtx.currentTime, 0.02);
    };
    PARAMS.byName('softClipDrive').apply = (m) => {
      if (fbkSoftClip) fbkSoftClip.curve = makeSoftClipCurve(m);
    };
  }

  // ─── LFO management ───────────────────────────────────────────────────────

  function startLfos() {
    pinkNoiseSource.start();
    sineOsc.start();
  }

  // Update all 64 LFOs (4 per voice × 16) using p5 Perlin noise() and write
  // the result into the audio params + cache for visualization. Called from
  // sketch.js's draw loop, ~60Hz. Smooth ramps via setTargetAtTime so per-frame
  // step changes don't introduce zipper noise.
  //
  // Per-voice noise inputs follow small-works' shape: scale = (j+1)(v+1)/80000,
  // with input = scale × frameCountEquivalent, varied per LFO type and voice.
  // We use audioCtx.currentTime × 60 as the frameCount equivalent.
  function updateLfos() {
    if (!started || !audioCtx || typeof noise !== 'function') return;

    const lfoSpeed     = PARAMS.mappedValue(PARAMS.byName('lfoSpeed'));     // ~0.1..5
    const lfoVariance  = PARAMS.mappedValue(PARAMS.byName('lfoVariance'));  // 0..1
    const panRange     = PARAMS.mappedValue(PARAMS.byName('panRange'));     // 0..1
    const ampRange     = PARAMS.mappedValue(PARAMS.byName('ampRange'));     // 0..2
    const cutoffBase   = PARAMS.mappedValue(PARAMS.byName('cutoffBase'));   // 200..12000 Hz
    const resonance    = PARAMS.mappedValue(PARAMS.byName('resonance'));    // 0..3

    const t60 = audioCtx.currentTime * 60; // ~ frameCount equivalent
    const now = audioCtx.currentTime;

    // voiceFactor=(v+1) matches small-works' (i+1) so each voice drifts at a
    // distinct rate (slowest voice 0, fastest voice 15).
    for (let v = 0; v < 16; v++) {
      const voiceFactor = (v + 1) * (1 + lfoVariance);

      // Each LFO type uses j+1 in the small-works divisor:
      //   panInput   uses j=0 → factor 1
      //   ampInput   uses j=1 → factor 2
      //   cutoffInput uses j=2 → factor 3
      //   resInput   uses j=3 → factor 4
      // Divisor 25000 gives roughly small-works' max LFO rate at v=15 with
      // lfoSpeed=1 — feels active without being twitchy.
      const baseScale = lfoSpeed * voiceFactor / 25000;

      // Distinct seed offsets so noise patterns differ per (LFO, voice).
      const panX    = (1 * baseScale * t60) + v * 17;
      const ampX    = (2 * baseScale * t60) + v * 31 + 1000;
      const cutoffX = (3 * baseScale * t60) + v * 47 + 2000;
      const resX    = (4 * baseScale * t60) + v * 61 + 3000;

      const panN    = noise(panX);     // 0..1
      const ampN    = noise(ampX);
      const cutoffN = noise(cutoffX);
      const resN    = noise(resX);

      // Apply to audio params.
      voicePanners[v].pan.value = (panN * 2 - 1) * panRange;
      // Amp: 0.3 minimum baseline so voices never go fully silent (Perlin can
      // hover at low values for slow inputs); LFO modulates the upper portion.
      voiceAmpGains[v].gain.value = 0.3 + ampN * ampRange * 0.7;
      // Cutoff: noise(0..1) maps to a band around cutoffBase.
      const cutoffHz = Math.max(80, cutoffBase * (0.5 + cutoffN));
      voiceFilters[v].frequency.value = Math.min(cutoffHz, 12000);
      voiceFilters[v].Q.value = resN * resonance;

      // Cache for visualization.
      voiceLfoCache[v].pan    = panN;
      voiceLfoCache[v].amp    = ampN;
      voiceLfoCache[v].cutoff = cutoffN;
      voiceLfoCache[v].res    = resN;
    }
  }

  // ─── Public controls ──────────────────────────────────────────────────────

  function isStarted() { return started; }

  function setMicMuted(muted) {
    if (micMuteGate) {
      micMuteGate.gain.value = muted ? 0 : 1;
    }
  }

  function setOutputMuted(muted) {
    if (outputMuteGate) {
      outputMuteGate.gain.value = muted ? 0 : 1;
    }
  }

  function getVoiceAnalysers() { return voiceAnalysers; }
  function getInputAnalyser()  { return inputAnalyser; }
  function getInputLevel()     {
    if (!PARAMS.byName('micVol')) return 0;
    return PARAMS.mappedValue(PARAMS.byName('micVol'));
  }

  // Read cached Perlin LFO outputs (populated by updateLfos each frame). All
  // values are 0..1 (raw noise output, before scaling by ranges). The
  // visualization scales them to canvas coordinates.
  function getVoiceLfoState(v) {
    if (!voiceLfoCache[v]) return { pan: 0.5, amp: 0.5, cutoff: 0.5, res: 0.5 };
    return voiceLfoCache[v];
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    start,
    isStarted,
    setMicMuted,
    setOutputMuted,
    getVoiceAnalysers,
    getInputAnalyser,
    getInputLevel,
    getVoiceLfoState,
    updateLfos,
  };
})();
