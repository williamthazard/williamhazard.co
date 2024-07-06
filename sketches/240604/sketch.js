function preload() {
  img = loadImage('assets/240604.png');
  snd = loadSound('assets/240604.mp3');
}
function setup() {
  let cnv = createCanvas(windowWidth,windowHeight);
  cnv.mousePressed(canvasPressed);
  snd.playMode('restart');
  if (deviceOrientation === LANDSCAPE) {
    img.resize(0,350);
  } else {
    img.resize(0,350);
  }
  fft = new p5.FFT();
}
function canvasPressed() {
  if (snd.isLooping() === true) {
    snd.stop();
  } else if (snd.isLooping() === false) {
    snd.loop(0,1/2);
  }
}
function draw() {
  background(35);
  if (deviceOrientation === LANDSCAPE) {
    image(img, (width/2)-315, (height/2)-200);
  } else {
    image(img, (width/2)-315, (height/2)-200);
  }
  let wave = fft.waveform();
  noFill();
  beginShape();
  stroke(255);
  for (let i = 0; i < wave.length; i++){
    let x = map(i, 0, wave.length, 0, width);
    let y = map( wave[i], -1, 1, 0, height+500);
    vertex(x,y);
  }
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}