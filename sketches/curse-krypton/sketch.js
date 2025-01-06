let ind = 0;
function preload() {snd = loadSound('assets/bald-crow.mp3')}
function setup() {let cnv = createCanvas(windowWidth-40, windowHeight-40);
  cnv.mousePressed(canvasPressed); snd.playMode('restart')}
function draw() {
  background(35); textSize(50); 
  fill('white'); frameRate(0.25);
  ind = (frameCount*4)%lines.length;
  for (let x = 0; x < 5; x+= 1) {
    text(lines[(ind+x)%lines.length].text,
      lines[(ind+x)%lines.length].align[0],
      lines[(ind+x)%lines.length].align[1])}}
function canvasPressed() {if (snd.isPlaying() === true) {snd.stop()} else {snd.play()}}
function windowResized() {resizeCanvas(windowWidth, windowHeight)}