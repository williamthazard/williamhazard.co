let randoms = [];
let rand_y = [];
let links = [];

function preload() {
  soundFormats('mp3', 'ogg');
  img = loadImage('../../sketches/240604/assets/240604.png');
  snd = loadSound('../../sketches/240604/assets/240604.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  snd.loop();
  fft = new p5.FFT();
  links[0] = createA('../1', 'this');
  links[1] = createA('../3', 'was');
  links[2] = createA('../4', 'today');
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

function draw() {
  background(34);
  image(img, (width/2)-400, (height/2)-200);
  let wave = fft.waveform();
  noFill();
  beginShape();
  stroke(255);
  for (let i = 0; i < wave.length; i++){
    let x = map(i, 0, wave.length, 0, width);
    let y = map(wave[i], -1, 1, 0, height+500);
    vertex(x,y);
  }
  endShape();
  for(let i = 0; i < links.length; i++){
    links[i].position(randoms[i], rand_y[i]+i*100); 
    // Set the position of the links on the page
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}