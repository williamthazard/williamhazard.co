let scenes = [
  { kind: "title" },
  { kind: "reading" },
  { kind: "video", file: "frolic-trim", scale: 2 },
  { kind: "video", file: "shake-trim" },
  { kind: "image", file: "korg-microkorg-xl-37-key-synthesizer-vocoder-in-black.jpeg" },
  { kind: "video", file: "fcf" },
  { kind: "video", file: "o-monsters-trim" },
  { kind: "video", file: "already-over-trim" },
  { kind: "video", file: "cda-trim" },
  { kind: "video", file: "tijts" },
  { kind: "video", file: "norns-trim" },
  { kind: "video", file: "woods-trim" },
  { kind: "video", file: "bigbug-trim" },
  { kind: "video", file: "bmt-trim" },
  { kind: "video", file: "naherinlied-trim" }
];

let images = {};
let videos = {};
let readingPics = [];
let subSlides = [];
let slide = 0;
let pending = 0;
let loaded = 0;

function buildSubSlides() {
  subSlides = [];
  for (let s of scenes) {
    if (s.kind === "video") {
      subSlides.push({ kind: "image", file: s.file, scale: s.scale });
      subSlides.push({ kind: "video", file: s.file, scale: s.scale });
      subSlides.push({ kind: "image", file: s.file, scale: s.scale });
    } else {
      subSlides.push(s);
    }
  }
}

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  buildSubSlides();

  for (let i = 1; i <= 6; i++) {
    pending++;
    loadImage(
      `assets/rdg-0${i}.jpeg`,
      (pic) => { readingPics[i - 1] = pic; loaded++; },
      (err) => console.log(err)
    );
  }

  for (let s of scenes) {
    if (s.kind === "video") {
      const file = s.file;
      pending++;
      loadImage(
        `assets/${file}.png`,
        (pic) => { images[file] = pic; loaded++; },
        (err) => console.log(err)
      );
      pending++;
      videos[file] = createVideo(
        [`assets/${file}.mp4`, `assets/${file}.webm`],
        () => { loaded++; }
      );
      videos[file].hide();
    } else if (s.kind === "image") {
      const file = s.file;
      pending++;
      loadImage(
        `assets/${file}`,
        (pic) => { images[file] = pic; loaded++; },
        (err) => console.log(err)
      );
    }
  }
}

function draw() {
  if (pending === 0 || loaded < pending) {
    drawLoading();
    return;
  }
  background(34);
  let s = subSlides[slide];
  if (!s) return;
  if (s.kind === "title") drawTitle();
  else if (s.kind === "reading") drawReading();
  else if (s.kind === "image") drawCenteredImage(images[s.file], s.scale);
  else if (s.kind === "video") drawCenteredVideo(videos[s.file], s.scale);
}

function drawLoading() {
  background(80);
  fill(255);
  noStroke();
  textSize(40);
  let msg = `loading... ${loaded} / ${pending}`;
  text(msg, width / 2 - textWidth(msg) / 2, height / 2);
  fill(255, 50);
  rect(width / 2 - 150, height / 2 + 30, 300, 20, 10);
  fill(255, 100);
  rect(width / 2 - 150, height / 2 + 30, 300 * loaded / Math.max(pending, 1), 20, 10);
}

function drawTitle() {
  textSize(50);
  fill(255);
  textStyle(BOLD);
  let title = "poems with computers:";
  text(title, width / 2 - textWidth(title) / 2, height / 2 - 100);
  textStyle(NORMAL);
  let subtitle = "on making the lied suite";
  text(subtitle, width / 2 - textWidth(subtitle) / 2, height / 2 - 25);
  textSize(30);
  let author = "William Hazard";
  text(author, width / 2 - textWidth(author) / 2, height / 2 + 125);
}

function drawReading() {
  for (let i = 0; i < 6; i++) {
    let im = readingPics[i];
    if (!im) continue;
    let yOff = (i % 2 === 0) ? -50 : 300;
    image(
      im,
      width / 2 - 525 + (im.width * ((i % 3) / 2)),
      height / 2 - yOff,
      im.width / 3,
      im.height / 3
    );
  }
}

function drawCenteredImage(im, scale) {
  if (!im) return;
  scale = scale || 1;
  let w = im.width * scale;
  let h = im.height * scale;
  image(im, width / 2 - w / 2, height / 2 - h / 2, w, h);
}

function drawCenteredVideo(v, scale) {
  if (!v) return;
  scale = scale || 1;
  let w = v.width * scale;
  let h = v.height * scale;
  image(v, width / 2 - w / 2, height / 2 - h / 2, w, h);
}

function syncVideos() {
  let current = subSlides[slide];
  for (let s of scenes) {
    if (s.kind === "video") {
      let v = videos[s.file];
      if (!v) continue;
      if (current && current.kind === "video" && current.file === s.file) {
        v.play();
      } else {
        v.stop();
      }
    }
  }
}

function keyPressed() {
  let oldSlide = slide;
  if (keyCode === LEFT_ARROW) slide = Math.max(0, slide - 1);
  else if (keyCode === RIGHT_ARROW) slide = Math.min(subSlides.length - 1, slide + 1);
  if (slide !== oldSlide) {
    syncVideos();
    console.log("now displaying sub-slide " + slide);
  }
}

function touchStarted() {
  let oldSlide = slide;
  slide = Math.min(subSlides.length - 1, slide + 1);
  if (slide !== oldSlide) {
    syncVideos();
    console.log("now displaying sub-slide " + slide);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
