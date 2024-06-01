let img, snd, soundTrue, wide, tall;
let changeRate = 1;
let choose = [];

function preload() {
  img = loadImage('assets/images/night-smaller.png');
  snd = loadSound('assets/sounds/voices-small.wav');
  font = loadFont('assets/fonts/RobotoMono-VariableFont_wght.ttf');
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.mousePressed(canvasPressed);
  snd.playMode('restart');
  frameRate(24);
  textFont(font);
  if (deviceOrientation === LANDSCAPE) {
    img.resize(300,300);
    textSize(20);
  } else {
    img.resize(600,600);
    textSize(40);
  }
}

function canvasPressed() {
  if (snd.isLooping() === true) {
    snd.stop();
  } else if (snd.isLooping() === false) {
    snd.loop(0,1/2);
  }
}

function pickNew(a,b) {
  var v = random(lines[a].indices);
  while (lines[a].indices[b] === v) {
    v = random(lines[a].indices);
  }
  return v;
}

function draw() {
  background(35,35,35);
  if (deviceOrientation === LANDSCAPE) {
    image(img, (width/2)-150, (height/2)-150);
  } else {
    image(img, (width/2)-300, (height/2)-300);
  }
  lines.forEach(
    (i,ind) => {
      choose[ind] = random(0,changeRate);
      let now = lines[ind].alpha[lines[ind].current];
      let soon = lines[ind].alpha[lines[ind].next];
      lines[ind].alpha[lines[ind].current] = now - choose[ind];
      lines[ind].alpha[lines[ind].next] = soon + choose[ind];
      lines[ind].text.forEach(
        (j,txt) => {
          if(lines[ind].alpha[txt] >= 100) {
            lines[ind].current = txt;
            lines[ind].next = pickNew(ind,txt);
          }
          fill(255,255,255,lines[ind].alpha[txt]);
          if (deviceOrientation === LANDSCAPE) {
            text(
              lines[ind].text[txt],
              (width/2)-110,
              (height/2)-50+(40*(ind))
            );
          } else if (deviceOrientation === PORTRAIT) {
            text(
              lines[ind].text[txt],
              (width/2)-225,
              (height/2)-100+(80*(ind))
            );
          }
        }
      )
    }
  )
  fill(255,255,255,75);
  if (snd.isLooping() === true) {
    soundTrue = "audio on";
  } else {
    soundTrue = "audio off";
  }
  if (deviceOrientation === LANDSCAPE) {
    wide = (width/2)+40;
    tall = (height/2)+145;
  } else if (deviceOrientation === PORTRAIT) {
    wide = (width/2)+80;
    tall = (height/2)+290
  }
    text(
      soundTrue,
      wide,
      tall
    );
}