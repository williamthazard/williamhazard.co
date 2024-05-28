let img, loader;
let voices = [];
let x = 0;
let a = 0;
let b = 0;
let c = 0;
let mover = false;

function preload() {
  img = loadImage('assets/images/fig.jpeg');
  for (let i = 1; i < 6; i += 1) {
    loader = 'assets/sounds/hit' + i + '.wav';
    voices.push(loadSound(loader));
    voices[i-1].playMode('untilDone')
  }
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.mousePressed(canvasPressed);
  background(110);
  image(img, (width/2)-400, (height/2)-100);
  a = width/2;
  b = height/2;
  c = 12;
  let loopTime = '8n';
  soundLoop = new p5.SoundLoop(onSoundLoop, loopTime);
}

function canvasPressed() {
  // ensure audio is enabled
  userStartAudio();

  if (soundLoop.isPlaying) {
    soundLoop.stop();
    mover = false;
  } else {
    // start the loop
    soundLoop.start();
    mover = true;
  }
}

function onSoundLoop(timeFromNow) {
  x = random(voices);
  x.play(timeFromNow);
}

function draw() {
  if (mover === true) {
    a = a + random([1,-1]);
    b = b + random([1,-1]);
    c = c + random([1,-1]);
    image(img, (width/2)-400, 100);
    textSize(c);
    text('o',a,b);
  }
}