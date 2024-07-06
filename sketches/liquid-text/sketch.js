let img,snd,font;
let changeRate = 1;
let choose = [];
let range = ["bass","lowMid","mid","highMid","treble"];
let rates = [-6/2,-8/3,-10/4,-2/1,-3/2,-4/3,-5/4,-1,-4/5,-3/4,-2/3,-1/2,-4/10,-3/8,-2/6,-1/4,1/4,2/6,3/8,4/10,1/2,2/3,3/4,4/5,1,5/4,4/3,3/2,2/1,10/4,8/3,6/2]

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
    snd.loop(0,1);
  }
}

function draw() {
  background(35);
  image(img, (width/2)-150, (height/2)-150);
  snd.rate(rates[round(map(mouseX,0,width,0,rates.length-1))]);
  snd.setVolume(map(mouseY,height,0,0,1));
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
  textSize(20+(fft.getEnergy(range[lines.length])));
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}