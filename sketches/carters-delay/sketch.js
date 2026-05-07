// sketch.js — Carter's Delay p5 lifecycle + visualization.
// Draws 16 colored grain circles around a center ring oscilloscope.

const VOICE_COUNT = 16;
let voiceColors = [];   // 16 p5 colors

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);

  // Build a palette: 16 evenly-spaced hues at moderate saturation/brightness.
  for (let v = 0; v < VOICE_COUNT; v++) {
    const hue = (v * (360 / VOICE_COUNT) + 200) % 360; // start at blue-ish
    voiceColors.push(color(hue, 70, 95));
  }

  background(10, 10, 18);

  UI.showBegin(async () => {
    await AUDIO.start();
    const result = await MIDI.connect();
    if (!result.ok) {
      // No MIDI — that's OK. Visualization still runs.
      return;
    }
    if (!result.hasInput || !result.hasOutput) {
      UI.showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
        if (inputId || outputId) {
          await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
        }
      });
    }
  });
}

function draw() {
  // Subtle trail effect — slight alpha background instead of full clear.
  push();
  colorMode(RGB, 255, 255, 255, 255);
  background(10, 10, 18, 40);
  pop();

  // Drain MIDI input + apply param values into the audio graph.
  if (typeof MIDI !== 'undefined' && MIDI.drainInputs) MIDI.drainInputs();
  PARAMS.modulationPass();
  PARAMS.applyAll();

  // Draw if audio is ready.
  if (AUDIO.isStarted()) {
    drawCenterScope();
    drawVoiceCircles();
  }

  if (typeof MIDI !== 'undefined' && MIDI.flushLedQueue) MIDI.flushLedQueue();
}

function drawCenterScope() {
  const inputAnalyser = AUDIO.getInputAnalyser();
  if (!inputAnalyser) return;

  // Base radius scales with the Mic Vol setting (input level).
  const micVolMapped = PARAMS.mappedValue(PARAMS.byName('micVol'));   // 0..1 (post-curve)
  const minR = Math.min(width, height) * 0.04;
  const maxR = Math.min(width, height) * 0.20;
  const baseR = minR + (maxR - minR) * micVolMapped;

  // Read time-domain waveform.
  const bufLen = inputAnalyser.fftSize || 2048;
  const wave = new Float32Array(bufLen);
  inputAnalyser.getFloatTimeDomainData(wave);

  push();
  noFill();
  stroke(220, 220, 240, 130);
  strokeWeight(1.5);
  const cx = width / 2;
  const cy = height / 2;
  const wobble = Math.min(width, height) * 0.06;

  // Two halves (flipper pattern) for symmetry.
  for (let half = 0; half < 2; half++) {
    const flip = half === 0 ? -1 : 1;
    beginShape();
    for (let k = 0; k <= 180; k++) {
      const ind = Math.floor(map(k, 0, 180, 0, wave.length - 1));
      const r = baseR + wave[ind] * wobble;
      const angle = radians(k);
      const x = cx + flip * r * Math.sin(angle);
      const y = cy + r * Math.cos(angle);
      vertex(x, y);
    }
    endShape();
  }
  pop();
}

function drawVoiceCircles() {
  const analysers = AUDIO.getVoiceAnalysers();
  if (!analysers || analysers.length === 0) return;

  const margin = Math.min(width, height) * 0.15; // keep circles away from edges
  const minR = Math.min(width, height) * 0.02;
  const maxR = Math.min(width, height) * 0.10;

  for (let v = 0; v < VOICE_COUNT; v++) {
    const a = analysers[v];
    if (!a) continue;

    const { pan, amp } = AUDIO.getVoicePanAndAmp(v);

    // Position: pan → x, amp → y (LFO-driven motion).
    const x = map(pan, -1, 1, margin, width - margin);
    const y = map(amp, 0, 2, height - margin, margin);   // higher amp = higher on screen

    // Diameter: from analyser RMS.
    const bufLen = a.fftSize || 256;
    const wave = new Float32Array(bufLen);
    a.getFloatTimeDomainData(wave);
    let sumSq = 0;
    for (let i = 0; i < bufLen; i++) sumSq += wave[i] * wave[i];
    const rms = Math.sqrt(sumSq / bufLen);
    const diameter = map(constrain(rms, 0, 0.5), 0, 0.5, minR, maxR);

    // Filled circle.
    const c = voiceColors[v];
    push();
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();
    fill(hue(c), saturation(c), brightness(c), 60);
    circle(x, y, diameter * 2);

    // Oscilloscope ring around the circle.
    if (diameter > 1) {
      noFill();
      stroke(hue(c), saturation(c), brightness(c), 90);
      strokeWeight(1);
      const ringMin = diameter * 1.1;
      const ringWobble = diameter * 0.5;
      for (let half = 0; half < 2; half++) {
        const flip = half === 0 ? -1 : 1;
        beginShape();
        for (let k = 0; k <= 180; k++) {
          const ind = Math.floor(map(k, 0, 180, 0, wave.length - 1));
          const r = ringMin + wave[ind] * ringWobble;
          const angle = radians(k);
          const xr = x + flip * r * Math.sin(angle);
          const yr = y + r * Math.cos(angle);
          vertex(xr, yr);
        }
        endShape();
      }
    }
    pop();
  }
}

function keyPressed() {
  if (key === 'd' || key === 'D') UI.toggleDebug();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mouseWheel(event) {
  if (typeof UI !== 'undefined' && UI.isMouseOverDebug && UI.isMouseOverDebug(event.clientX, event.clientY)) return;
}
