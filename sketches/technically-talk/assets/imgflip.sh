echo ">> resize images"
function resize() {
  for file in *; do
    file=${file%.*}
    if [ -e $file.jpeg ]; then
      mogrify -resize 800x800^ -gravity center -extent 1:1 -strip ${file}.jpeg
      echo "$file.jpeg resized"
    fi
    maxsize=100
    realsize=$(du -m $file.mp4 | cut -f 1)
    if [ -e $file.mov ]; then
      echo "$file already converted to .mov"
    else
      echo "building $file.mov"
      ffmpeg -y -i ${file}.mp4 -preset veryfast -c:v h264_videotoolbox -q:v 50 -movflags +faststart ${file}.mov
      echo "$file.mov built"
    fi
    if [ -e $file.webm ]; then
      echo "$file already converted to .webm"
    else
      echo "building $file.webm"
      ffmpeg -y -i ${file}.mov -preset veryfast -q:v 50 -movflags +faststart ${file}.webm
      echo "$file.webm built"
    fi
    if [ $realsize -ge $maxsize ]; then
      mv $file.mov $file-old.mov
      echo "rebuilding $file.mov"
      ffmpeg -y -i ${file}.mp4 -preset veryfast -c:v h264_videotoolbox -q:v 50 -movflags +faststart ${file}.mov
      echo "file.mov rebuilt"
      echo "removing original $file.mov"
      rm $file-old.mov
      echo "original $file.mov removed"
    fi
    if [ -e $file.mp4 ]; then
      ffmpeg -i ${file}.mp4 -frames:v 1 -f image2 ${file}.png;
      echo "$file poster created"
    fi
  done
}
resize