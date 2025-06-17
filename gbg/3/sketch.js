let img, loader;
let voices = [];
let randoms = [];
let rand_y = [];
let links = [];
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
  a = 400;
  b = height/2;
  c = 12;
  let loopTime = '8n';
  soundLoop = new p5.SoundLoop(onSoundLoop, loopTime);
  userStartAudio();
  soundLoop.start();
  mover = true;
  links[0] = createA('../1', 'another');
  links[1] = createA('../2', 'person');
  links[2] = createA('../4', 'fishing');
  for(let i = 0; i < links.length; i++){
    if(windowWidth > windowHeight){
      randoms.push(random(5,windowWidth-windowWidth/2))
    } else {
      randoms.push(random(5,windowHeight-windowHeight/2))
    }
  }
  for(let i = 0; i < links.length; i++){
    rand_y.push(random((windowHeight/2)-200,windowHeight/2))
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
    image(img, (width/2)-450, (height/2)-225);
    textSize(c);
    text('o',a,b);
  }
  for(let i = 0; i < links.length; i++){
    links[i].position(randoms[i], rand_y[i]+i*100); 
    // Set the position of the links on the page
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}