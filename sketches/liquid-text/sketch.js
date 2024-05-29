let img, snd;
let words = [
  "i can yell that",
  "he was wagering, but",
  "it was justice for",
  "he was weaseling",
  "i can't tell what",
  "he was waiting for",
  "it was justice, but",
  "he was wagering"
];
let lines = [];
let alphas = [100,100,100,100,0,0,0,0];
let bounce = [];
let chooser = [];

function preload() {
  img = loadImage('assets/images/night-smaller.png');
  snd = loadSound('assets/sounds/voices-small.wav');
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.mousePressed(canvasPressed);
  snd.playMode('restart');
  img.resize(800,800)
  textFont('Courier New');
  textSize(40);
  frameRate(24);
  for (let i = 0; i < 8; i += 1) {
    lines[i] = text(words[i],(width/2)-200,(height/2)+(65+(60*i%4)));
    bounce[i] = false;
  }
}

function canvasPressed() {
  if (snd.isLooping() === true) {
    snd.stop();
  } else if (snd.isLooping() === false) {
    // start the loop
    snd.loop(0,1/2);
  }
}

function draw() {
  background(35,35,35);
  image(img, (width/2)-400, (height/2)-400);
  for (let i = 0; i < 4; i += 1) {
    chooser[i] = random([0,1]);
    if (chooser[i] === 0) {
      chooser[i+4] = 1;
    } else {
      chooser[i+4] = 0;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    if (alphas[i] === 0) {
      bounce[i] = true;
    } else if (alphas[i] === 100) {
      bounce[i] = false;
    }
    fill(255,255,255,alphas[i]);
    lines[i] = text(words[i],(width/2)-200,(height/2)-65+(60*(i%4)));
    if (bounce[i] === false && chooser[i] === 0) {
      alphas[i] = alphas[i] - 1;
    } else if (bounce[i] === true && chooser[i] === 1) {
        alphas[i] = alphas[i] + 1;
    }
  }
  fill(255,255,255,75);
  if (snd.isLooping() === true) {
    text("audio on",(width/2)+175,(height/2)+380);
  } else if (snd.isLooping() === false) {
    text("audio off",(width/2)+175,(height/2)+380);
  }
}
