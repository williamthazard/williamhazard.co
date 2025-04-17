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
let rates = [0.25,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1,1,1,1.5,1.5,2,2];
let attackTime = 3;
let decayTime = 1;
let susPercent = 1/(freq.length*2);
let releaseTime = 3;
let counter = 0;
let soundOn = false;
let loading = true;
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

function metaSound(i, filename) {
  loadSound(filename, soundLoaded, error, progress);
  function soundLoaded(sound) {
    //console.log('sample ' + i + ': ' + filename + ' loaded');
    sample[i] = sound;
    sample[i].playMode('untilDone');
    fft[i] = new p5.FFT();
    sampFilter[i] = new p5.LowPass();
    sample[i].disconnect();
    sample[i].connect(sampFilter[i]);
    counter++;
    if (counter == numSamples) {
      loading = false;
    }
  }
  function error(err) {
    console.log(err);
  }
  function progress(percent) {
    textSize(25);
    fill(255);
    noStroke();
    text(
      'sample ' + i + floor(percent*10)+'%',
      width/2-75,
      height/2+50+25*i
    );
  }
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  
  // Load samples
  metaSound(0, 'assets/0.mp3');
  metaSound(1, 'assets/1.mp3');
  metaSound(2, 'assets/2.mp3');
  metaSound(3, 'assets/3.mp3');
  metaSound(4, 'assets/4.mp3');
  metaSound(5, 'assets/5.mp3');
  metaSound(6, 'assets/6.mp3');
  metaSound(7, 'assets/7.mp3');
  
  // for(let i = 0; i<numSamples; i += 1) { (doesn't work)
  //   let path = '/assets/'+i+'.mp3';
  //   metaSound(i, path);
  // }
  
  for(let i = 0; i<freq.length; i += 1) {
    // Create the carrier oscillator
    cRatio[i] = 1;
    mRatio[i] = 1;
    carrier[i] = new p5.Oscillator('triangle');
    carrier[i].freq((freq[i]/2) * cRatio[i]);
    carrier[i].amp(1/(freq.length*2));

    // Create the modulator oscillator
    modulator[i] = new p5.Oscillator('sine');

    // Disconnect modulator from audio output
    modulator[i].disconnect();
    
    // Create a lowpass filter for our synth
    lpf[i] = new p5.LowPass();
    carrier[i].disconnect();
    carrier[i].connect(lpf[i]);

    // Set initial modulation index value
    index[i] = 1;
    modulator[i].amp(0.8);
    
    // A place to put our lfos
    lfo[i] = [];
    
    // Create envelope
    env[i] = new p5.Envelope();
    env[i].setADSR(attackTime, decayTime, susPercent, releaseTime);
    env[i].setRange(1.0/(freq.length*2), 0.0);
  }
  
  // Use mouse press as sound on/off toggle
  cnv.mousePressed(envAttack);
  
  // For our FFT circles
  angleMode(DEGREES);
}

function draw() {
  if (loading) { //a nicer-looking loading screen
    background(34+numSamples-counter);
    textSize(100);
    fill(255);
    noStroke();
    text('loading...',width/2-175,height/2);
  } else { //this will only run after our samples are loaded
    background(34);
    for(let i=0; i<freq.length; i += 1) {
      
      //LFOs
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
      
      //additional sampler-specific LFOs
      sampLfo[i] = [];
      for(let j=0; j<6; j += 1) {
        sampLfo[i][j] = noise(((j+1)*(i+1)+6)/40000 * frameCount);
      }
      
      //three in ten thousand chance of playing for each sample
      playChance[i] = random(1,10000);
      
      //60/40 chance of forward/reverse playback, respectively
      let rev = [-1,-1,-1,-1,1,1,1,1,1,1];
      
      //choose a playback rate at random from our rates table
      rate[i] = rates[
        floor(random(0,rates.length))
      ]*rev[
        floor(random(0,rev.length))
      ];
      
      //choose a starting point for sample playback at random
      cue[i] = random(0,sample[i].duration()-(sample[i].duration()/50));
      
      //choose a duration of sample playback at random
      dur[i] = random(sample[i].duration()/1000,sample[i].duration()/100);
      
      //play command using our random choices above
      if (playChance[i]<3 && soundOn == true) {
        sample[i].play(
          0,
          rate[i],
          1,
          cue[i],
          dur[i] * abs(rate[i])
        );
      }
      
      //update sampler filter cutoff
      sampFilter[i].freq(
        map(sampLfo[i][0],0,1,0,10000),
        1/getTargetFrameRate()
      );
      
      //update sampler filter resonance
      sampFilter[i].res(
        map(sampLfo[i][5],0,1,0.001,3),
        1/getTargetFrameRate()
      );
      
      //update sampler pan position
      sample[i].pan(map(lfo[i][1],0,1,-1,1));
      
      //update sampler level
      sample[i].amp(sampLfo[i][3]);
      
      //draw a circle FFT visualizer for each playing sampler
      if (sample[i].isPlaying() == true) {
        stroke(colorStrings[i]+sampLfo[i][0]+")");
        noFill();
        let flipper;
        fft[i].setInput(sampFilter[i]);
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
    
    //draw circles using the LFOs that are driving our synths
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
      sample[i].pause();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}