#!/bin/bash
cd ..
echo ">> process gifs"
function giflip() {
    for file in *.gif ; do
        file=${file%.*}
        maxsize=100
        realsize=$(du -m $file.gif | cut -f 1)
        if [ $realsize -ge $maxsize ]; then
            mv $file.gif $file-old.gif
            echo "rebuilding $file.gif"
            ffmpeg -y -i ${file}-old.gif -filter_complex "fps=24,scale=1024:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer" ${file}.gif
            echo "file.gif rebuilt"
            echo "removing original $file.gif"
            rm $file-old.gif
            echo "original $file.gif removed"
        fi
    done
}
function bigkill() {
    for file in *.gif ; do
        file=${file%.*}
        maxsize=100
        realsize=$(du -m $file.gif | cut -f 1)
        if [ $realsize -ge $maxsize ]; then
            rm $file.gif
            echo "$file.gif is too large and has been removed"
        fi
    done
}
cd log/pics
giflip
bigkill
cd ../../