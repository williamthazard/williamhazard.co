let segments = [];
let poemLines = [];
let targetScroll = 0;
let currentScroll = 0;
let totalPoemHeight = 0;

// Audio variables
let poemAudio;
let lowPass;
let distortion;
let glitchDelay;
let reverb;

let muteBtn;
let volSlider;
let isMuted = true;
let audioStarted = false;
let playbackDirection = 1.0;

const FONT_SIZE = 42;
const LINE_HEIGHT = FONT_SIZE * 1.6;
const LINE_SPACING = 1; // Vertical sampling step
const SAMPLE_STEP = 1; // Horizontal sampling step

function preload() {
  // Load the poem and the audio track
  poemLines = loadStrings('assets/perpetuum.txt');
  poemAudio = loadSound('assets/we-live-inside-a-dream.mp3');
}

// Audio icons (Lucide-inspired SVGs)
const speakerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
const muteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  // Advanced Audio Chain: Audio -> Filter -> Distortion -> Delay (Glitch) -> Reverb -> Output
  lowPass = new p5.LowPass();
  distortion = new p5.Distortion();
  glitchDelay = new p5.Delay();
  reverb = new p5.Reverb();

  // Set initial clear state
  lowPass.freq(20000);
  reverb.drywet(0);
  glitchDelay.delayTime(0.01);
  glitchDelay.feedback(0);

  // Route audio through the chain
  poemAudio.disconnect();
  poemAudio.connect(lowPass);
  lowPass.connect(distortion);
  distortion.connect(glitchDelay);
  glitchDelay.connect(reverb);

  // Set initial muted state
  poemAudio.setVolume(0);

  // Create UI for audio controls
  createAudioUI();

  // Build the entire poem's segments once
  buildSegments();
}

function createAudioUI() {
  let ui = createDiv();
  ui.id('audio-controls');
  ui.style('position', 'fixed');
  ui.style('bottom', '30px');
  ui.style('right', '30px');
  ui.style('display', 'flex');
  ui.style('align-items', 'center');
  ui.style('gap', '15px');
  ui.style('background', 'rgba(15, 15, 25, 0.6)');
  ui.style('padding', '10px 18px');
  ui.style('border-radius', '50px');
  ui.style('backdrop-filter', 'blur(12px)');
  ui.style('border', '1px solid rgba(255, 255, 255, 0.1)');
  ui.style('box-shadow', '0 8px 32px rgba(0,0,0,0.4)');
  ui.style('z-index', '1000');
  ui.style('user-select', 'none');

  muteBtn = createButton(muteIcon);
  muteBtn.parent(ui);
  muteBtn.style('background', 'none');
  muteBtn.style('border', 'none');
  muteBtn.style('color', '#e0e0f0');
  muteBtn.style('display', 'flex');
  muteBtn.style('align-items', 'center');
  muteBtn.style('justify-content', 'center');
  muteBtn.style('cursor', 'pointer');
  muteBtn.style('padding', '0');
  muteBtn.style('width', '30px');
  muteBtn.style('height', '30px');
  muteBtn.mousePressed(toggleAudio);

  volSlider = createSlider(0, 1, 0.5, 0.01);
  volSlider.parent(ui);
  volSlider.style('width', '80px');
  volSlider.style('cursor', 'pointer');
  volSlider.style('accent-color', '#ffffff');
  volSlider.style('background', 'transparent');
  volSlider.style('height', '4px');
  volSlider.style('outline', 'none');
}

function toggleAudio() {
  if (!audioStarted) {
    // First time activation
    userStartAudio().then(() => {
      poemAudio.loop();
      audioStarted = true;
      isMuted = false;
      muteBtn.html(speakerIcon);
      poemAudio.setVolume(volSlider.value());
    });
  } else {
    // Normal toggle
    isMuted = !isMuted;
    if (isMuted) {
      muteBtn.html(muteIcon);
      poemAudio.setVolume(0);
    } else {
      muteBtn.html(speakerIcon);
      poemAudio.setVolume(volSlider.value());
    }
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
  pg.style('font-family', 'monospace');

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
}

function draw() {
  background(0);

  currentScroll = lerp(currentScroll, targetScroll, 0.1);

  let nf = 0.15;
  let t = frameCount * 0.012;

  // Organic intensity: Sine backbone (starting at -1) + Perlin noise wobble (fading in)
  let sineWave = sin(frameCount * 0.0005 - HALF_PI);
  let perlinNoise = noise(frameCount * 0.005) * 2 - 1; 
  
  // Gradually introduce noise over the first 200 frames to ensure a clean 0 start
  let noiseLevel = map(constrain(frameCount, 0, 200), 0, 200, 0, 0.35);
  let combinedVal = lerp(sineWave, perlinNoise, noiseLevel);
  
  let intensity = map(combinedVal, -1, 1, 0, 225);

  // Advanced Audio Mirroring Logic + Resonant Glitch System
  if (audioStarted) {
    let normInt = intensity / 225; // Normalize to 0-1

    // 1. Muffle (LowPass Filter)
    let f = map(pow(normInt, 1.2), 0, 1, 20000, 300);
    lowPass.freq(f);

    // 2. Grittiness (Distortion)
    let d = map(normInt, 0, 1, 0, 0.95);
    distortion.set(d, 'none');

    // 3. Wash (Reverb)
    let rw = map(pow(normInt, 2.0), 0, 1, 0, 0.88);
    reverb.drywet(rw);

    // 4. Glitch: Pitch Jitter + Temporal Reversal
    if (normInt > 0.15) {
      let jitter = (noise(frameCount * 0.8) - 0.5) * normInt * 0.25;
      
      // Randomly flip direction when above peak threshold
      if (normInt > 0.7 && random() < 0.05) {
        playbackDirection *= -1;
      } else if (normInt <= 0.7) {
        playbackDirection = 1;
      }
      
      poemAudio.rate((1 + jitter) * playbackDirection);
    } else {
      playbackDirection = 1;
      poemAudio.rate(1.0);
    }

    // 5. Glitch: Temporal Stutter (Digital jumping/skipping)
    if (normInt > 0.88 && random() < 0.04) {
      let skipAmount = random(0.01, 0.75);
      poemAudio.jump(max(0, poemAudio.currentTime() - skipAmount));
    }

    if (!isMuted) {
      poemAudio.setVolume(volSlider.value());
    }
  }

  stroke(210, 215, 235);
  strokeWeight(2.5);
  noFill();

  let viewportTop = currentScroll - 100;
  let viewportBottom = currentScroll + height + 100;

  for (let seg of segments) {
    if (seg.y < viewportTop || seg.y > viewportBottom) continue;

    let displayY = seg.y - currentScroll;

    beginShape();
    for (let x of seg.pts) {
      let dy = (noise(x * nf, seg.y * nf, t) - 0.5) * intensity;
      let dx = (noise(x * nf + 500, seg.y * nf + 500, t) - 0.5) * intensity * 0.4;
      vertex(x + dx, displayY + dy);
    }
    endShape();
  }
}

function mouseWheel(event) {
  targetScroll += event.delta;
  targetScroll = constrain(targetScroll, 0, totalPoemHeight - height);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildSegments();
}
