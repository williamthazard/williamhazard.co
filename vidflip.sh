#!/bin/bash
function vidflip() {
    for file in *.mov ; do
        file=${file%.*}
        maxsize=100
        realsize=$(du -m $file.mov | cut -f 1)
        if [ -e $file.mp4 ]; then
            echo "$file already converted to .mp4"
        else
            echo "building $file.mp4"
            ffmpeg -y -i ${file}.mov -preset veryfast -c:v h264_videotoolbox -q:v 50 -movflags +faststart ${file}.mp4
            echo "$file.mp4 built"
        fi
        if [ -e $file.ogg ]; then
            echo "$file already converted to .ogg"
        else
            echo "building $file.ogg"
            ffmpeg -y -i ${file}.mov -preset veryfast -movflags +faststart ${file}.ogg
            echo "$file.ogg built"
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
        if [ -e $file.jpeg ]; then
            echo "$file poster applied"
        else
            ffmpeg -ss 0.5 -i ${file}.mp4 -frames:v 1 -f image2 ${file}.jpeg;
            echo "$file poster created"
        fi
    done
}
cd log/pics
vidflip
cp -r -f ../pics ../entries
cd ../../