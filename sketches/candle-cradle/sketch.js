let dents = [0,25];
let rates = [-2/1,-3/2,-4/3,-5/4,-1,-4/5,-3/4,-2/3,-1/2,-4/10,-3/8,-2/6,-1/4,1/4,2/6,3/8,4/10,1/2,2/3,3/4,4/5,1,5/4,4/3,3/2,2/1,10/4,8/3];
let range = ["bass","lowMid","mid","highMid","treble"];
let changeRate = 1;
let choose = [];
let img, snd, sndRate;

function preload() {
  img = loadImage('assets/images/night-16x9.png');
  snd = loadSound('assets/sounds/voices-small.wav');
}

function setup() {
  let cnv = createCanvas(windowWidth,windowHeight);
  cnv.mousePressed(canvasPressed);
  textFont("Courier");
  img.resize(500,0);
  fft = new p5.FFT();
}

function canvasPressed() {
  if (snd.isLooping() === true) {
    snd.stop();
  } else if (snd.isLooping() === false) {
    snd.loop(0,1);
  }
}

function draw() {
  sndRate = rates[round(map(mouseX,0,width,0,rates.length-1))];
  snd.rate(sndRate);
  snd.setVolume(map(mouseY,height,0,0,1));
  fft.analyze();
  background(35+abs(sndRate)*20-1);
  image(img, (width/2)-250, (height/2)-115);
  lines.forEach(
    (i,ind) => {
      choose[ind] = random([0,0,0,0,0,0,0,0,0,changeRate]);
      lines[ind].text.forEach(
        (j,txt) => {
          if(lines[ind].bounce[txt] === false) {
            lines[ind].alpha[txt] = lines[ind].alpha[txt] - choose[ind];
          } else if (lines[ind].bounce[txt] === true) {
            lines[ind].alpha[txt] = lines[ind].alpha[txt] + choose[ind];
          }
          if(lines[ind].alpha[txt] <= 0) {
            lines[ind].bounce[txt] = true;
            lines[ind].alpha[txt] = 0;
          } else if (lines[ind].alpha[txt] >= 100) {
            lines[ind].bounce[txt] = false;
            lines[ind].alpha[txt] = 100;
          }
          textSize(20+(fft.getEnergy(range[ind])/20));
          fill(255,lines[ind].alpha[txt]);
          text(
            lines[ind].text[txt],
            width/2-215+dents[ind%dents.length],
            height/2-25+40*ind
          )
        }
      )
    }
  )
  textSize(20+(fft.getEnergy(range[lines.length])));
  fill(255,75);
  if (snd.isLooping() === true) {
    text(
      "audio on",
      width/2+115,
      height/2+155
    );
  } else if (snd.isLooping() === false) {
    text(
      "audio off",
      width/2+115,
      height/2+155
    )
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}