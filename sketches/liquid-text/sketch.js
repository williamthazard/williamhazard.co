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
  if (deviceOrientation === LANDSCAPE) {
    img.resize(300,300);
    textSize(20);
    for (let i = 0; i < 8; i += 1) {
      lines[i] = text(words[i],(width/2)-200,(height/2)+(65+(40*i%4)));
      bounce[i] = false;
    }
  } else {
    img.resize(600,600);
    textSize(40);
    for (let i = 0; i < 8; i += 1) {
      lines[i] = text(words[i],(width/2)-400,(height/2)+(130+(60*i%4)));
      bounce[i] = false;
    }
  }
  textFont('Courier New');
  frameRate(24);
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
  if (deviceOrientation === LANDSCAPE) {
    image(img, (width/2)-150, (height/2)-150);
  } else {
    image(img, (width/2)-300, (height/2)-300);
  }
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
    if (deviceOrientation === LANDSCAPE) {
      lines[i] = text(words[i],(width/2)-110,(height/2)-50+(40*(i%4)));
    } else {
      lines[i] = text(words[i],(width/2)-225,(height/2)-100+(80*(i%4)));
    }
    if (bounce[i] === false && chooser[i] === 0) {
      alphas[i] = alphas[i] - 1;
    } else if (bounce[i] === true && chooser[i] === 1) {
        alphas[i] = alphas[i] + 1;
    }
  }
  fill(255,255,255,75);
  if (snd.isLooping() === true && deviceOrientation === LANDSCAPE) {
    text("audio on",(width/2)+40,(height/2)+145);
  } else if (snd.isLooping() === false && deviceOrientation === LANDSCAPE) {
    text("audio off",(width/2)+40,(height/2)+145)
  } else if (snd.isLooping() === true && deviceOrientation === PORTRAIT) {
    text("audio on",(width/2)+80,(height/2)+290);
  } else if (snd.isLooping() === false && deviceOrientation === PORTRAIT) {
    text("audio off",(width/2)+80,(height/2)+290);
  }
}
