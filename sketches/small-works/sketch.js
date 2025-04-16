var numSamples = 8;
var sample = [];
var playChance = [];
var rate = [];
var cue = [];
var dur = [];
var fft = [];
var wave = [];
let carrier = [];
let modulator = [];
let mRatio = [];
let cRatio = [];
let index = [];
let env = [];
let lpf = [];
let sampFilter = [];
let lfo = [];
let sampLfo = [];
let freq = [174,285,396,417,528,639,741,852];
let rates = [0.25,0.5,1,1.5,2,3,4];
let attackTime = 3;
let decayTime = 1;
let susPercent = 1/(freq.length*2);
let releaseTime = 3;
let soundOn = false;
let colorStrings = [
  'rgba(255, 255, 255, ', //white
  'rgba(255, 0, 0, ', //red
  'rgba(255, 165, 0, ', //orange
  'rgba(255, 255, 0, ', //yellow
  'rgba(60, 179, 113, ', //green
  'rgba(0, 0, 255, ', //blue
  'rgba(106, 90, 205, ', //indigo
  'rgba(127, 0, 255, ' //violet
];
let amplitude;

function preload() {
  sample[0] = loadSound('/assets/0.mp3');
  sample[1] = loadSound('/assets/1.mp3');
  sample[2] = loadSound('/assets/2.mp3');
  sample[3] = loadSound('/assets/2.mp3');
  sample[4] = loadSound('/assets/2.mp3');
  sample[5] = loadSound('/assets/2.mp3');
  sample[6] = loadSound('/assets/2.mp3');
  sample[7] = loadSound('/assets/2.mp3');
  for(let i = 0; i<numSamples; i += 1) {
    //console.log(`/assets/${i}.mp3`);
    //sample[i] = loadSound(`/assets/${i}.mp3`); --doesn't work
    sample[i].playMode('untilDone');
  }
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  
  for(let i = 0; i<numSamples; i += 1) {
    fft[i] = new p5.FFT();
    sampFilter[i] = new p5.LowPass();
    sample[i].disconnect();
    sample[i].connect(sampFilter[i]);
  }
  
  for(let i = 0; i<freq.length; i += 1) {
    // Create the carrier oscillator
    cRatio[i] = 1;
    mRatio[i] = 1;
    carrier[i] = new p5.Oscillator('triangle');
    carrier[i].freq((freq[i]/2) * cRatio[i]);
    carrier[i].amp(1/(freq.length*2));

    // Create the modulator oscillator
    modulator[i] = new p5.Oscillator('sine');

    // disconnect modulator from audio output
    modulator[i].disconnect();
    
    lpf[i] = new p5.LowPass();
    carrier[i].disconnect();
    carrier[i].connect(lpf[i]);

    // Set initial modulation index value
    index[i] = 1;
    modulator[i].amp(0.8);
    
    lfo[i] = [];
    
    //create envelope
    env[i] = new p5.Envelope();
    env[i].setADSR(attackTime, decayTime, susPercent, releaseTime);
    env[i].setRange(1.0/(freq.length*2), 0.0);
  }
  
  amplitude = new p5.Amplitude();
  
  cnv.mousePressed(envAttack);
  angleMode(DEGREES);
}

function draw() {
  background(34);
  
  for(let i=0; i<freq.length; i += 1) {
    
    for(let j=0; j<6; j += 1) {
      lfo[i][j] = noise(((j+1)*(i+1))/40000 * frameCount);
    }
    
    //update filter cutoff (corresponds to circle alpha)
    lpf[i].freq(map(lfo[i][0],0,1,0,10000),1/getTargetFrameRate());
    
    //update pan position (corresponds to circle x pos)
    carrier[i].pan(map(lfo[i][1],0,1,-1,1),0.01);
    
    //update the modulation index (corresponds to circle y pos)
    index[i] = map(lfo[i][2],0,1,0,3);
    modulator[i].amp(index[i], 0.01);
    
    //update level of each voice (corresponds to circle diameter)
    if (soundOn == true) {
      env[i].ramp(
        carrier[i],
        1/getTargetFrameRate(),
        map(lfo[i][3],0,1,0,1/(freq.length/2))
      )
    }
    
    //update the modulator frequency
    mRatio[i] = map(lfo[i][4],0,1,0,24);
    modulator[i].freq(
      (freq[i]/2) * mRatio[i], 
      1/getTargetFrameRate()
    );
    
    //update filter resonance
    lpf[i].res(
      map(lfo[i][5],0,1,0.001,3),
      1/getTargetFrameRate()
    );
  }
  
  for(let i = 0; i<numSamples; i += 1) {
    sampLfo[i] = [];
    for(let j=0; j<6; j += 1) {
      sampLfo[i][j] = noise(((j+1)*(i+1)+6)/40000 * frameCount);
    }
    playChance[i] = random(1,10000);
    let rev = [-1,1,1];
    rate[i] = rates[
      floor(random(0,rates.length))
    ]*rev[
      floor(random(0,3))
    ];
    cue[i] = random(0,sample[i].duration()-(sample[i].duration()/25));
    dur[i] = random(sample[i].duration()/1000,sample[i].duration()/100);
  
    if (playChance[i]<3 && soundOn == true) {
      sample[i].play(
        0,
        rate[i],
        1,
        cue[i],
        dur[i]
      );
    }
    
    sampFilter[i].freq(
      map(sampLfo[i][0],0,1,0,10000),
      1/getTargetFrameRate()
    );
    sampFilter[i].res(
      map(sampLfo[i][5],0,1,0.001,3),
      1/getTargetFrameRate()
    );
    sample[i].pan(map(lfo[i][1],0,1,-1,1));
    sample[i].amp(sampLfo[i][3]);
  
    if (sample[i].isPlaying() == true) {
      stroke(colorStrings[i]+sampLfo[i][0]+")");
      noFill();
      let flipper;
      sample[i].play();
      fft[i].setInput(sample[i]);
      wave[i] = fft[i].waveform();
      for(var j=0; j<2; j += 1) {
        if (j==0) {
          flipper = -1
        } else {
          flipper = 1
        }
        beginShape();
        for(var k=0; k<=180; k ++) {
          var ind = floor(map(k,0,180,0,wave[i].length-1));
          var r = map(
            wave[i][ind],
            -1,
            1,
            map(sampLfo[i][3],0,1,0,width/5),
            map(sampLfo[i][3],0,1,0,height/5)
          );
          var x = map(
            lfo[i][1],
            0,
            1,
            width/5,
            width-width/5
          ) + r*sin(k)*flipper;
          var y = map(
            lfo[i][2],
            0,
            1,
            height/5,
            height-height/5
          ) + r*cos(k);
          vertex(x,y);
        }
        endShape();
      }
    }
  }
  
  for(let i=0; i<colorStrings.length; i += 1) {
    fill(colorStrings[i]+lfo[i][0]+")");
    noStroke();
    circle(
      map(lfo[i][1],0,1,width/5,width-width/5),
      map(lfo[i][2],0,1,height/5,height-height/5),
      map(lfo[i][3],0,1,0,width*height/2000)
    )
  }
}

function envAttack() {
  if (soundOn == false) {
    attackTime = 1/getTargetFrameRate();
    releaseTime = 1/getTargetFrameRate();
    for(let i=0; i<freq.length; i += 1) {
      env[i].setADSR(
        attackTime, 
        decayTime, 
        susPercent, 
        releaseTime
      );
      carrier[i].start();
      modulator[i].start();
      env[i].triggerAttack(carrier[i]);
    }
    soundOn = true
  } else {
    soundOn = false;
    for(let i=0; i<freq.length; i+= 1) {
      env[i].triggerRelease(carrier[i]);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}