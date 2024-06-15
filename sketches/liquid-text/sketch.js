let img, snd;
let changeRate = 1;
let choose = [];
let range = ["bass","lowMid","mid","highMid","treble"];

function preload() {
  img = loadImage(
    'assets/images/night-smaller.png'
  );
  snd = loadSound(
    'assets/sounds/voices-small.wav'
  );
  font = loadFont(
    'assets/fonts/RobotoMono-VariableFont_wght.ttf'
  );
}

function setup() {
  let cnv = createCanvas(
    windowWidth, 
    windowHeight
  );
  fft = new p5.FFT();
  cnv.mousePressed(canvasPressed);
  snd.playMode('restart');
  frameRate(24);
  textFont(font);
  img.resize(300,300);
  textSize(20);
  lines.forEach(
    (i,ind) => {
      text(
        lines[ind].text[lines[ind].currentText],
        (width/2)-200,
        (height/2)+(65+(40*ind))
      );
    }
  );
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
  image(img, (width/2)-150, (height/2)-150);
  fft.analyze();
  lines.forEach(
    (i,ind) => {
      choose[ind] = random([0,changeRate]);
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
          textSize(20+(fft.getEnergy(range[ind])/10));
          fill(255,255,255,lines[ind].alpha[txt]);
          text(
            lines[ind].text[txt],
            (width/2)-110,
            (height/2)-50+(40*(ind))
          );
        }
      )
    }
  )
  textSize(20+(fft.getEnergy(lines.length)/10));
  fill(255,255,255,75);
  if (snd.isLooping() === true) {
    text(
      "audio on",
      (width/2)+40,
      (height/2)+145
    );
  } else if (snd.isLooping() === false) {
    text(
      "audio off",
      (width/2)+40,
      (height/2)+145
    )
  }
}