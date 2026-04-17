require("L5")

local scenes = {
  { kind = "title" },
  { kind = "reading" },
  { kind = "video", file = "frolic-trim", scale = 2 },
  { kind = "video", file = "shake-trim" },
  { kind = "image", file = "korg-microkorg-xl-37-key-synthesizer-vocoder-in-black.jpeg" },
  { kind = "video", file = "fcf" },
  { kind = "video", file = "o-monsters-trim" },
  { kind = "video", file = "already-over-trim" },
  { kind = "video", file = "cda-trim" },
  { kind = "video", file = "tijts" },
  { kind = "video", file = "norns-trim" },
  { kind = "video", file = "woods-trim" },
  { kind = "video", file = "bigbug-trim" },
  { kind = "video", file = "bmt-trim" },
  { kind = "video", file = "naherinlied-trim" },
}

local images = {}
local videos = {}
local readingPics = {}
local subSlides = {}
local slide = 0

local function buildSubSlides()
  subSlides = {}
  for _, s in ipairs(scenes) do
    if s.kind == "video" then
      table.insert(subSlides, { kind = "image", file = s.file, scale = s.scale })
      table.insert(subSlides, { kind = "video", file = s.file, scale = s.scale })
      table.insert(subSlides, { kind = "image", file = s.file, scale = s.scale })
    else
      table.insert(subSlides, s)
    end
  end
end

local function centeredImage(im, scale)
  scale = scale or 1
  local w = im:getWidth() * scale
  local h = im:getHeight() * scale
  image(im, width / 2 - w / 2, height / 2 - h / 2, w, h)
end

local function centeredVideo(v, scale)
  scale = scale or 1
  local w = v:getWidth() * scale
  local h = v:getHeight() * scale
  image(v._video, width / 2 - w / 2, height / 2 - h / 2, w, h)
end

local function centeredText(s, y)
  text(s, width / 2 - textWidth(s) / 2, y)
end

function setup()
  fullscreen()
  for i = 1, 6 do
    readingPics[i] = loadImage(string.format("assets/rdg-%02d.jpeg", i))
  end
  for _, s in ipairs(scenes) do
    if s.kind == "video" then
      images[s.file] = loadImage("assets/" .. s.file .. ".png")
      videos[s.file] = loadVideo("assets/" .. s.file .. ".ogv")
    elseif s.kind == "image" then
      images[s.file] = loadImage("assets/" .. s.file)
    end
  end
  buildSubSlides()
end

local function drawTitle()
  fill(255)
  textSize(50)
  local title = "poems with computers:"
  centeredText(title, height / 2 - 100)
  text(title, width / 2 - textWidth(title) / 2 + 1, height / 2 - 100)
  centeredText("on making the lied suite", height / 2 - 25)
  textSize(30)
  centeredText("William Hazard", height / 2 + 125)
end

local function drawReading()
  for i = 1, 6 do
    local im = readingPics[i]
    local h_off = (i % 2 == 1) and -50 or 300
    image(
      im,
      width / 2 - 525 + (im:getWidth() * (((i - 1) % 3) / 2)),
      height / 2 - h_off,
      im:getWidth() / 3,
      im:getHeight() / 3
    )
  end
end

function draw()
  background(34)
  local s = subSlides[slide + 1]
  if not s then return end
  if s.kind == "title" then
    drawTitle()
  elseif s.kind == "reading" then
    drawReading()
  elseif s.kind == "image" then
    centeredImage(images[s.file], s.scale)
  elseif s.kind == "video" then
    centeredVideo(videos[s.file], s.scale)
  end
end

local function syncVideos()
  local current = subSlides[slide + 1]
  for _, s in ipairs(scenes) do
    if s.kind == "video" then
      local v = videos[s.file]
      if current and current.kind == "video" and current.file == s.file then
        v:play()
      else
        v:stop()
      end
    end
  end
end

function keyPressed()
  local oldSlide = slide
  if key == "left" then
    slide = math.max(0, slide - 1)
  elseif key == "right" then
    slide = math.min(#subSlides - 1, slide + 1)
  end
  if slide ~= oldSlide then
    syncVideos()
    print("now displaying sub-slide " .. slide)
  end
end

function mousePressed()
  local oldSlide = slide
  slide = math.min(#subSlides - 1, slide + 1)
  if slide ~= oldSlide then
    syncVideos()
    print("now displaying sub-slide " .. slide)
  end
end
