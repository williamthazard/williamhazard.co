// sketch.js — Carter's Delay p5 lifecycle. Visualization lands in Task 31.
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  background(10, 10, 18);

  UI.showBegin(async () => {
    await AUDIO.start();
    const result = await MIDI.connect();
    if (result.ok && (!result.hasInput || !result.hasOutput)) {
      UI.showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
        if (inputId || outputId) {
          await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
        }
      });
    }
  });
}

function draw() {
  background(10, 10, 18);

  if (typeof MIDI !== 'undefined' && MIDI.drainInputs) MIDI.drainInputs();
  PARAMS.modulationPass();
  PARAMS.applyAll();

  // Visualization (16 circles + center scope) implemented in Task 31.
  fill(80, 80, 100);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  textFont('monospace');
  text('carters-delay scaffold — visualization coming next', width / 2, height / 2);

  if (typeof MIDI !== 'undefined' && MIDI.flushLedQueue) MIDI.flushLedQueue();
}

function keyPressed() {
  if (key === 'd' || key === 'D') UI.toggleDebug();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mouseWheel(event) {
  if (typeof UI !== 'undefined' && UI.isMouseOverDebug && UI.isMouseOverDebug(event.clientX, event.clientY)) return;
  // No scroll behavior for this sketch.
}
