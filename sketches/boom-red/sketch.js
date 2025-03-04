let ind = 0;
function setup() {
  let cnv = createCanvas(windowWidth, windowHeight)
  }
function draw() { 
  background(34); textSize(50); frameRate(random(weights));
  ind = (frameCount*4)%lines.length;
  for (let x = 0; x < random(1,5); x+= 1) {
    intensity = random(0.25,0.95); 
    fill('rgba(255, 255, 255, '+intensity+')');
    text(lines[(ind+x)%lines.length],
    random(200,windowWidth-200),random(200,windowHeight-200))}}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight)}