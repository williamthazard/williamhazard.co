let video = [];
let numImages = 20;
let numVids = 7;
let slide = 0;
let counter = 0;
let vidCounter = 0;
let loading = true;
let img = [];
let playing = false;

function vidLoader(i, filename) {
  video[i] = createVideo(filename, vidLoaded);
  function vidLoaded() {
    vidCounter++;
  }
}

function imageLoader(i, filename) {
  loadImage(filename, imageLoaded, error);
  function imageLoaded(pic) {
    img[i] = pic;
    counter++;
  }
  function error(err) {
    console.log(err);
  }
}

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  
  // Load images
  imageLoader(0, 'assets/dickinson-envelope.jpeg');
  imageLoader(1, 'assets/rdg-01.jpeg');
  imageLoader(2, 'assets/rdg-02.jpeg');
  imageLoader(3, 'assets/rdg-03.jpeg');
  imageLoader(4, 'assets/rdg-04.jpeg');
  imageLoader(5, 'assets/rdg-05.jpeg');
  imageLoader(6, 'assets/rdg-06.jpeg');
  imageLoader(7, 'assets/wh-site.jpeg');
  imageLoader(8, 'assets/typewriter-poem.jpeg');
  imageLoader(9, 'assets/williams-scrip.jpeg');
  imageLoader(10, 'assets/that-this-3.jpeg');
  imageLoader(11, 'assets/711.jpeg');
  imageLoader(12, 'assets/waterwater.jpeg');
  imageLoader(13, 'assets/frolic-trim.png');
  imageLoader(14, 'assets/shake-trim.png');
  imageLoader(15, 'assets/fcf.png');
  imageLoader(16, 'assets/cda-trim.png');
  imageLoader(17, 'assets/already-over-trim.png');
  imageLoader(18, 'assets/tijts.png');
  imageLoader(19, 'assets/woods-trim.png');
  
  // Load videos
  vidLoader(0, ['assets/frolic-trim.mp4','assets/frolic-trim.mov','assets/frolic-trim.webm']);
  vidLoader(1, ['assets/shake-trim.mp4','assets/shake-trim.mov']);
  vidLoader(2, ['assets/fcf.mp4','assets/fcf.mov','assets/fcf.webm']);
  vidLoader(3, ['assets/cda-trim.mp4','assets/cda-trim.webm']);
  vidLoader(4, ['assets/already-over-trim.mp4','assets/already-over-trim.mov','assets/already-over-trim.webm']);
  vidLoader(5, ['assets/tijts.mp4','assets/tijts.mov','assets/tijts.webm']);
  vidLoader(6, ['assets/woods-trim.mp4','assets/woods-trim.mov','assets/woods-trim.webm']);
}

function draw() {
  if (counter == numImages && vidCounter == numVids) {
    loading = false;
  }
  if (loading) { //a nicer-looking loading screen
    background(34+numImages-counter);
    fill(255,50);
    rect(width/2-155,height/2-205,300,20,10);
    noStroke();
    fill(255,100);
    var w = 300 * (counter + 1) / numImages;
    rect(width/2-155,height/2-205,w,20,10);
    textSize(100);
    fill(255);
    noStroke();
    text(
      'loading...',
      width/2-175,
      height/2-240
    );
    textSize(10);
    for (let i = 0; i < numImages; i++) {
      let loadText;
      let loadAlpha;
      if (counter < i) {
        loadText = `image ${i+1} loading`;
        loadAlpha = 100;
      } else {
        loadText = `image ${i+1} loaded ✅`;
        loadAlpha = 255;
      }
      fill(loadAlpha);
      text(
        loadText,
        width/2-70,
        height/2-150+15*i
      );
    }
    for (let i = 0; i < numVids; i++) {
      let loadText;
      let loadAlpha;
      if (vidCounter < i) {
        loadText = `video ${i+1} loading`;
        loadAlpha = 100;
      } else {
        loadText = `video ${i+1} loaded ✅`;
        loadAlpha = 255;
      }
      fill(loadAlpha);
      text(
        loadText,
        width/2-70,
        height/2-150+15*i+(numImages*15)
      );
    }
  } else { //this will only run after our images are loaded
    background(34);
    if (slide == 0) {
      textSize(50);
      fill(255);
      textStyle(BOLD);
      text(
        'the function as a breath of thought:', 
        width/2-400, 
        height/2-100
      );
      textStyle(NORMAL);
      text(
        'on the computer as a compositional \nand performance tool for poetry', 
        width/2-400, 
        height/2-25
      );
      textSize(30);
      textStyle(NORMAL);
      text(
        'William Hazard & Mike Bagwell', 
        width/2-225, 
        height/2+125
      );
    } else if (slide == 1) {
      image(
        img[7],
        width/2-img[7].width/2,
        height/2-img[7].height/2, 
        img[7].width, 
        img[7].height
      )
    } else if (slide ==2) {
      for (let i = 1; i < 7; i++) {
        let h = [300,-50];
        image(
          img[i], 
          width/2-525+(img[i].width*(((i-1)%3)/2)), 
          height/2-h[i%2], 
          img[i].width/3, 
          img[i].height/3
        )
      }
    } else if (slide == 3) {
      for (let i = 0; i < 3; i++) {
        let ind = [0,9,8];
        let more = [0,1,1];
        image(
          img[ind[i]],
          width/2-735+(img[ind[i]].width*i/1.5),
          height/2-img[ind[i]].height/4,
          img[ind[i]].width/2,
          img[ind[i]].height/2
        )
      }
    } else if (slide == 4) {
      textSize(20);
      textStyle(BOLD)
      text(
        'Why I Take Good Care of my Macintosh',
        width/2-250,
        20
      );
      textStyle(ITALIC);
      text(
        'Gary Snyder',
        width/2+30,
        50
      );
      textStyle(NORMAL);
      text(
      'Because it broods under its hood like a perched falcon,\nBecause it jumps like a skittish horse\n  and sometimes throws me\nBecause it is poky when cold\nBecause plastic is a sad, strong material\n  that is charming to rodents\nBecause it is flighty\nBecause my mind flies into it through my fingers\nBecause it leaps forward and backward,\n  is an endless sniffer and searcher,\nBecause its keys click like hail on a boulder\nAnd it winks when it goes out,\n\nAnd puts word-heaps in hoards for me,\n  dozens of pockets of\n  gold under boulders in streambeds, identical seedpods\n  strong on a vine, or it stores bins of bolts;\nAnd I lose them and find them,\n\nBecause whole worlds of writing can be boldly layed out\n  and then highlighted and vanish in a flash\n  at "delete"     so it teaches\nof impermanence and pain;\nAnd because my computer and me are both brief\n  in this world, both foolish, and we have earthly fates,\nBecause I have let it move in with me\n  right inside the tent\nAnd it goes with me out every morning\nWe fill up our baskets,       get back home,\nFeel rich,      relax,      I throw it a scrap and it hums.',
        width/2-250,
        80
      )
    } else if (slide == 5) {
      image(
        img[11],
        width/2-img[11].width/2,
        height/2-img[11].height/2,
        img[11].width,
        img[11].height
      )
    } else if (slide == 6) {
      image(
        img[12],
        width/2-img[12].width/2,
        height/2-img[12].height/2,
        img[12].width,
        img[12].height
      );
    } else if (slide == 7) {
      image(
        img[13],
        width/2-img[13].width,
        height/2-img[13].height,
        img[13].width*2,
        img[13].height*2
      );
    } else if (slide == 8) {
      image(
        video[0],
        width/2-video[0].width,
        height/2-video[0].height,
        video[0].width*2,
        video[0].height*2
      )
    } else if (slide == 9) {
      image(
        img[13],
        width/2-img[13].width,
        height/2-img[13].height,
        img[13].width*2,
        img[13].height*2
      );
    } else if (slide == 10) {
      image(
        img[14],
        width/2-img[14].width/2,
        height/2-img[14].height/2,
        img[14].width,
        img[14].height
      );
    } else if (slide == 11) {
      image(
        video[1],
        width/2-video[1].width/2,
        height/2-video[1].height/2,
        video[1].width,
        video[1].height
      )
    } else if (slide == 12) {
      image(
        img[14],
        width/2-img[14].width/2,
        height/2-img[14].height/2,
        img[14].width,
        img[14].height
      );
    } else if (slide == 13) {
      image(
        img[15],
        width/2-img[15].width/2,
        height/2-img[15].height/2,
        img[15].width,
        img[15].height
      );
    } else if (slide == 14) {
      image(
        video[2],
        width/2-video[2].width/2,
        height/2-video[2].height/2,
        video[2].width,
        video[2].height
      )
    } else if (slide == 15) {
      image(
        img[15],
        width/2-img[15].width/2,
        height/2-img[15].height/2,
        img[15].width,
        img[15].height
      );
    } else if (slide == 16) {
      image(
        img[16],
        width/2-img[16].width/2,
        height/2-img[16].height/2,
        img[16].width,
        img[16].height
      );
    } else if (slide == 17) {
      image(
        video[3],
        width/2-video[3].width/2,
        height/2-video[3].height/2,
        video[3].width,
        video[3].height
      )
    } else if (slide == 18) {
      image(
        img[16],
        width/2-img[16].width/2,
        height/2-img[16].height/2,
        img[16].width,
        img[16].height
      );
    } else if (slide == 19) {
      image(
        img[17],
        width/2-img[17].width/2,
        height/2-img[17].height/2,
        img[17].width,
        img[17].height
      );
    } else if (slide == 20) {
      image(
        video[4],
        width/2-video[4].width/2,
        height/2-video[4].height/2,
        video[4].width,
        video[4].height
      )
    } else if (slide == 21) {
      image(
        img[17],
        width/2-img[17].width/2,
        height/2-img[17].height/2,
        img[17].width,
        img[17].height
      );
    } else if (slide == 22) {
      image(
        img[18],
        width/2-img[18].width/2,
        height/2-img[18].height/2,
        img[18].width,
        img[18].height
      );
    } else if (slide == 23) {
      image(
        video[5],
        width/2-video[5].width/2,
        height/2-video[5].height/2,
        video[5].width,
        video[5].height
      )
    } else if (slide == 24) {
      image(
        img[18],
        width/2-img[18].width/2,
        height/2-img[18].height/2,
        img[18].width,
        img[18].height
      );
    } else if (slide == 25) {
      image(
        img[19],
        width/2-img[19].width/2,
        height/2-img[19].height/2,
        img[19].width,
        img[19].height
      );
    } else if (slide == 26) {
      image(
        video[6],
        width/2-video[6].width/2,
        height/2-video[6].height/2,
        video[6].width,
        video[6].height
      )
    } else if (slide == 27) {
      image(
        img[19],
        width/2-img[19].width/2,
        height/2-img[19].height/2,
        img[19].width,
        img[19].height
      );
    }
  }
}

function keyPressed() {
  let oldSlide = slide;
  if (keyCode === LEFT_ARROW) {
    slide = slide - 1;
    if (slide == 8) {
      video[0].loop()
    } else {
      video[0].stop()
    }
    if (slide == 11) {
      video[1].loop()
    } else {
      video[1].stop()
    }
    if (slide == 14) {
      video[2].loop()
    } else {
      video[2].stop()
    }
    if (slide == 17) {
      video[3].loop()
    } else {
      video[3].stop()
    }
    if (slide == 20) {
      video[4].loop()
    } else {
      video[4].stop()
    }
    if (slide == 23) {
      video[5].loop()
    } else {
      video[5].stop()
    }
    if (slide == 26) {
      video[6].loop()
    } else {
      video[6].stop()
    }
  } else if (keyCode === RIGHT_ARROW) {
    slide = slide + 1;
    if (slide == 8) {
      video[0].loop()
    } else {
      video[0].stop()
    }
    if (slide == 11) {
      video[1].loop()
    } else {
      video[1].stop()
    }
    if (slide == 14) {
      video[2].loop()
    } else {
      video[2].stop()
    }
    if (slide == 17) {
      video[3].loop()
    } else {
      video[3].stop()
    }
    if (slide == 20) {
      video[4].loop()
    } else {
      video[4].stop()
    }
    if (slide == 23) {
      video[5].loop()
    } else {
      video[5].stop()
    }
    if (slide == 26) {
      video[6].loop()
    } else {
      video[6].stop()
    }
  }
  if (slide != oldSlide) {
    console.log('now displaying slide ' + slide)
  }
}

function touchStarted() {
  let oldSlide = slide;
  slide = slide + 1;
  if (slide != oldSlide) {
    console.log('now displaying slide ' + slide)
  }
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}