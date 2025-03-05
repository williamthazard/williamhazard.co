let shape;
function preload() {
  shape = loadModel('teapot.obj', true);
}
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
}
function draw() {
  background(34); orbitControl();
  rotateX(PI); scale(2);
  model(shape); text()
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight)}