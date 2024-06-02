let img, snd, soundTrue, wide, tall, choose;
let changeRate = 2;
let pick = 0;
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
function newText(a,b) {
  var v = lines[a].text.indexOf(random(lines[a].text));
  do {
    v = lines[a].text.indexOf(random(lines[a].text));
  }
  while (lines[a].text.indexOf(b) === v);
  return v;
}
function newLine(a) {
  var v = round(random(lines.length-1));
  do {
    v = round(random(lines.length-1));
  } 
  while (a === v);
  return v;
}
function draw() {
  background(35);
  if (deviceOrientation === LANDSCAPE) {
    image(img, (width/2)-150, (height/2)-150);
  } else {
    image(img, (width/2)-300, (height/2)-300);
  }
  choose = random(0,changeRate);
  let now = lines[pick].alpha[lines[pick].current];
  let soon = lines[pick].alpha[lines[pick].next];
  lines[pick].alpha[lines[pick].current] = now - choose;
  lines[pick].alpha[lines[pick].next] = soon + choose;
  if(lines[pick].alpha[lines[pick].next] >= 100) {
    pick = newLine(pick);
  }
  for (var ind in lines) {
    for (var txt in lines[pick].text) {
      if(lines[pick].alpha[txt] >= 100) {
        lines[pick].current = txt;
        lines[pick].next = newText(pick,txt);
      }
      fill(255,lines[ind].alpha[txt]);
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
  }
  fill(255,75);
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