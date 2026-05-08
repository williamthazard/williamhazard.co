let segments = [];
let poemLines = [];
let targetScroll = 0;
let currentScroll = 0;
let totalPoemHeight = 0;

// Audio variables
let poemAudio;
let lowPass;
let distortion;
let reverb;
let prerecDelay = null;

let isMuted = true;
let audioStarted = false;
let playbackDirection = 1.0;
let lastDistAmount = 0;
let lastReverbDecay = -1;
let lastJumpTime = 0;
let touchY = 0;

let FONT_SIZE = 42;
let LINE_HEIGHT = FONT_SIZE * 1.6;
const LINE_SPACING = 1; // Vertical sampling step
const SAMPLE_STEP = 1; // Horizontal sampling step

function preload() {
  // Load the poem and the audio track
  poemLines = loadStrings('assets/perpetuum.txt');
  poemAudio = loadSound('assets/we-live-inside-a-dream.mp3');
}


async function setup() {
  calculateResponsiveSizes();
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  lowPass = new p5.LowPass();
  distortion = new p5.Distortion();
  reverb = new p5.Reverb();

  // Prerecorded-chain delay: granular Carter's Delay factory.
  prerecDelay = await Delay.create(getAudioContext());

  poemAudio.disconnect();
  poemAudio.connect(lowPass);
  lowPass.connect(distortion);
  // distortion → delay subsystem (multi-tap + feedback patchcord) → reverb
  distortion.connect(prerecDelay.input);
  prerecDelay.output.connect(reverb);

  poemAudio.setVolume(0);

  // Wire each audio-bound param's apply() into the audio chain.
  PARAMS.byName('lpfFreq').apply     = (mapped) => lowPass.freq(mapped);
  PARAMS.byName('lpfRes').apply      = (mapped) => lowPass.res(mapped);
  PARAMS.byName('distortion').apply  = (mapped) => {
    if (Math.abs(mapped - lastDistAmount) > 0.02) {
      distortion.set(mapped, 'none');
      lastDistAmount = mapped;
    }
  };
  PARAMS.byName('reverbWet').apply   = (mapped) => reverb.drywet(mapped);
  PARAMS.byName('reverbDecay').apply = (mapped) => {
    // p5.Reverb.set rebuilds the convolver impulse response on every call —
    // expensive. Only call when the value actually changes meaningfully.
    if (Math.abs(mapped - lastReverbDecay) > 0.05) {
      reverb.set(mapped, 2);
      lastReverbDecay = mapped;
    }
  };
  PARAMS.byName('delayTime').apply   = (mapped) => prerecDelay.setDelayTime(mapped);
  PARAMS.byName('delayFbk').apply    = (mapped) => prerecDelay.setFeedbackLevel(mapped);
  PARAMS.byName('delayWet').apply    = (mapped) => prerecDelay.setDelayWet(mapped);
  PARAMS.byName('preserve').apply    = (mapped) => prerecDelay.setPreserve(mapped);
  PARAMS.byName('fbkHpf').apply      = (mapped) => prerecDelay.setFeedbackHpf(mapped);
  PARAMS.byName('fbkNoise').apply    = (mapped) => prerecDelay.setFeedbackNoise(mapped);
  PARAMS.byName('fbkSine').apply     = (mapped) => prerecDelay.setFeedbackSine(mapped);
  PARAMS.byName('fbkSineHz').apply   = (mapped) => prerecDelay.setFeedbackSineHz(mapped);
  PARAMS.byName('cutoffBase').apply     = (m) => prerecDelay.setCutoffBase(m);
  PARAMS.byName('resonance').apply      = (m) => prerecDelay.setResonance(m);
  PARAMS.byName('panRange').apply       = (m) => prerecDelay.setPanRange(m);
  PARAMS.byName('ampRange').apply       = (m) => prerecDelay.setAmpRange(m);
  PARAMS.byName('lfoSpeed').apply       = (m) => prerecDelay.setLfoSpeed(m);
  PARAMS.byName('density').apply        = (m) => prerecDelay.setDensity(m);
  PARAMS.byName('grainDurScale').apply  = (m) => prerecDelay.setGrainDurScale(m);
  PARAMS.byName('softClipDrive').apply  = (m) => prerecDelay.setSoftClipDrive(m);
  PARAMS.byName('masterVol').apply   = (mapped) => {
    if (!isMuted && audioStarted) poemAudio.setVolume(mapped);
  };

  // Build the entire poem's segments once
  buildSegments();

  UI.showBegin(async () => {
    await startAudio();
    // Request the microphone in parallel with MIDI. Mic is optional;
    // permission denial or unavailable hardware → bank 3 knobs become no-ops.
    try {
      await MIC.start();
    } catch (e) {
      // Already handled inside MIC.start (returns ok:false). Non-fatal.
    }
    const result = await MIDI.connect();
    if (!result.ok) {
      PARAMS.setParam('masterVol', 0.5);
      setMuted(false);
      return;
    }
    if (result.hasInput && result.hasOutput) {
      PARAMS.setParam('masterVol', 0);
      setMuted(false);
      return;
    }
    UI.showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
      if (inputId || outputId) {
        await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
        PARAMS.setParam('masterVol', 0);
      } else {
        PARAMS.setParam('masterVol', 0.5);
      }
      setMuted(false);
    });
  });
}

function calculateResponsiveSizes() {
  // Find the longest line to determine the maximum safe font size
  let maxChars = 0;
  for (let line of poemLines) {
    if (line.length > maxChars) maxChars = line.length;
  }
  // If no lines, fallback to a sensible default
  if (maxChars === 0) maxChars = 20;

  // Mono fonts are typically ~0.6w of font size.
  // We want (maxChars * FONT_SIZE * 0.6) < windowWidth * 0.85 (with some padding)
  let targetSize = (windowWidth * 0.85) / (maxChars * 0.6);

  // Constrain between 18 and 42
  FONT_SIZE = constrain(targetSize, 18, 42);
  LINE_HEIGHT = FONT_SIZE * 1.6;
}


function startAudio() {
  if (audioStarted) return Promise.resolve();
  return userStartAudio().then(() => {
    poemAudio.loop();
    audioStarted = true;
  });
}

function setMuted(m) {
  isMuted = m;
  if (m) poemAudio.setVolume(0);
  // Unmute is implicit: PARAMS.applyAll pushes masterVol next frame.
  // Keep the switch state in sync so the press handler always knows the
  // actual mute state (otherwise programmatic setMuted calls — e.g. Begin —
  // can desync from SWITCHES.state.muted, requiring a redundant first press).
  if (typeof SWITCHES !== 'undefined' && SWITCHES.state) {
    SWITCHES.state.muted = m;
  }
}

function buildSegments() {
  totalPoemHeight = poemLines.length * LINE_HEIGHT + height;

  let pg = createGraphics(width, totalPoemHeight);
  pg.pixelDensity(1);
  pg.background(0);
  pg.fill(255);
  pg.noStroke();
  pg.textAlign(CENTER, TOP);
  pg.textSize(FONT_SIZE);
  pg.textFont('monospace');

  for (let i = 0; i < poemLines.length; i++) {
    let yDelta = i * LINE_HEIGHT + height * 0.2;
    pg.text(poemLines[i], width / 2, yDelta);
  }

  pg.loadPixels();
  let bufW = pg.width;
  let bufH = pg.height;

  segments = [];
  for (let y = 0; y < bufH; y += LINE_SPACING) {
    let inText = false;
    let pts = [];

    for (let x = 0; x < bufW; x += SAMPLE_STEP) {
      let idx = (y * bufW + x) * 4;
      if (idx >= 0 && idx < pg.pixels.length && pg.pixels[idx] > 128) {
        if (!inText) {
          pts = [];
          inText = true;
        }
        pts.push(x);
      } else if (inText) {
        if (pts.length >= 1) segments.push({ y, pts });
        inText = false;
      }
    }
    if (inText && pts.length >= 1) segments.push({ y, pts });
  }

  // Free the graphics context to prevent memory leak in p5's _elements internal list
  pg.remove();
}

function draw() {
  background(0);

  currentScroll = lerp(currentScroll, targetScroll, 0.1);

  if (typeof MIDI !== 'undefined' && MIDI.drainInputs) MIDI.drainInputs();

  if (SWITCHES.state.autoScrollOn) {
    const v = PARAMS.mappedValue(PARAMS.byName('autoScroll'));
    if (Math.abs(v) > 0.05) {
      const MAX_AUTO_SPEED = 10;
      targetScroll += v * MAX_AUTO_SPEED;
      targetScroll = constrain(targetScroll, 0, totalPoemHeight - height);
    }
    const denom = totalPoemHeight - height;
    PARAMS.setParam('scrollPos', denom > 0 ? targetScroll / denom : 0);
  } else {
    targetScroll = PARAMS.byName('scrollPos').manual * (totalPoemHeight - height);
  }

  PARAMS.modulationPass();
  PARAMS.applyAll();

  if (audioStarted) {
    if (prerecDelay && prerecDelay.updateLfos) prerecDelay.updateLfos();
    if (typeof MIC !== 'undefined' && MIC.tick) MIC.tick();
  }

  const visualIntensity   = PARAMS.mappedValue(PARAMS.byName('visualJag'));
  const nf                = PARAMS.mappedValue(PARAMS.byName('vSpatial'));
  const tInc              = PARAMS.mappedValue(PARAMS.byName('vTimeSpd'));
  const flowInc           = PARAMS.mappedValue(PARAMS.byName('vFlowSpd'));
  const t                 = frameCount * tInc;
  const flow              = frameCount * flowInc;
  const jitterAmt         = PARAMS.mappedValue(PARAMS.byName('jitterAmt'));
  const jitterFreq        = PARAMS.mappedValue(PARAMS.byName('jitterFreq'));
  const stutterProb       = PARAMS.mappedValue(PARAMS.byName('stutterProb'));
  const stutterMax        = PARAMS.mappedValue(PARAMS.byName('stutterMax'));
  const reverseProb       = PARAMS.mappedValue(PARAMS.byName('reverseProb'));
  const masterPitch       = PARAMS.mappedValue(PARAMS.byName('masterPitch'));

  if (audioStarted) {
    if (jitterAmt > 0) {
      const jitter = (noise(frameCount * jitterFreq) - 0.5) * jitterAmt;
      if (random() < reverseProb) playbackDirection *= -1;
      poemAudio.rate((1 + jitter) * playbackDirection * masterPitch);
    } else {
      playbackDirection = 1;
      poemAudio.rate(masterPitch);
    }

    if (random() < stutterProb && frameCount - lastJumpTime > 15) {
      if (poemAudio.bufferSource) {
        try {
          poemAudio.bufferSource.stop();
          poemAudio.bufferSource.disconnect();
        } catch (e) { /* ignore */ }
      }
      const skip = random(0.01, stutterMax);
      poemAudio.jump(max(0, poemAudio.currentTime() - skip));
      lastJumpTime = frameCount;
    }
  }

  if (typeof MIDI !== 'undefined' && MIDI.flushLedQueue) MIDI.flushLedQueue();

  stroke(210, 215, 235);
  strokeWeight(2.5);
  noFill();

  let viewportTop = currentScroll - 100;
  let viewportBottom = currentScroll + height + 100;

  for (let seg of segments) {
    if (seg.y < viewportTop || seg.y > viewportBottom) continue;

    let displayY = seg.y - currentScroll;

    beginShape();
    // Only apply distortion if visualIntensity is above a tiny threshold
    // Using Brown Noise (fBm) for continuous, nervous, and jaggy movement
    if (visualIntensity > 0.1) {
      for (let x of seg.pts) {
        let dy = (brownian(x * nf + flow, seg.y * nf + flow, t) - 0.5) * visualIntensity;
        let dx = (brownian(x * nf + 500 + flow, seg.y * nf + 500 + flow, t) - 0.5) * visualIntensity * 0.4;
        vertex(x + dx, displayY + dy);
      }
    } else {
      // Normal state: No noise, perfectly static
      for (let x of seg.pts) {
        vertex(x, displayY);
      }
    }
    endShape();
  }
}

function brownian(x, y, t) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  // 4 octaves of noise for a "nervous," jagged Brownian drift
  for (let i = 0; i < 4; i++) {
    val += noise(x * freq, y * freq, t * freq) * amp;
    amp *= 0.5;
    freq *= 2.1; // Slightly non-integer for more organic jitter
  }
  return val;
}

function mouseWheel(event) {
  // If the cursor is over the debug overlay, let the overlay handle the wheel
  // event natively (it has its own scrollbar). Don't preventDefault.
  if (typeof UI !== 'undefined' && UI.isMouseOverDebug &&
      UI.isMouseOverDebug(event.clientX, event.clientY)) {
    return;
  }
  targetScroll += event.delta;
  targetScroll = constrain(targetScroll, 0, totalPoemHeight - height);
  return false;
}

function touchStarted() {
  touchY = mouseY;
}

function touchMoved() {
  let deltaY = touchY - mouseY;
  targetScroll += deltaY;
  targetScroll = constrain(targetScroll, 0, totalPoemHeight - height);
  touchY = mouseY;
  return false;
}

function windowResized() {
  calculateResponsiveSizes();
  resizeCanvas(windowWidth, windowHeight);
  buildSegments();
}

function keyPressed() {
  if (key === 'd' || key === 'D') UI.toggleDebug();
}
