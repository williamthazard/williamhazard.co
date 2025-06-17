let randoms = [];
let links = [];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  links[0] = createA('https://williamhazard.co', 'this');
  links[1] = createA('https://williamhazard.co', 'constant');
  links[2] = createA('https://williamhazard.co', 'heat');
  for(let i = 0; i < links.length; i++){
    if(windowWidth > windowHeight){
      randoms.push(random(5,windowWidth-windowWidth/2))
    } else {
      randoms.push(random(5,windowHeight-windowHeight/2))
    }
  }
}

function draw() {
  background(34);
  rotateX(frameCount * 0.01);
  rotateY(frameCount * 0.01);
  fill(255);
  noStroke();
  box(windowWidth/4);
  for(let i = 0; i < links.length; i++){
    links[i].position(randoms[i], (i*i*windowHeight/7)+windowHeight/2-windowHeight/3); 
    // Set the position of the links on the page
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}