cd ..
echo ">> root .md to .html"
function htmlify() {
  for file in *.md; do
    date=$(date -r ${file} +%y%m%d)
    file=${file%.*}
    folder=$(basename $(pwd))
    echo "building $folder $file"
    target=index.html
    cat $1 > ${target}
    cmark --unsafe index.md >> ${target}
    cat $2 >> ${target}
    sed -i '' -e 's#DATE#'$date'#g' ${target}
    echo "$folder $file built"
  done
}
function resize() {
  for file in *; do
    file=${file%.*}
    if [ -e $file.jpeg ]; then
      mogrify -resize 800x450^ -gravity center -extent 16:9 -strip ${file}.jpeg
      echo "$file image resized"
    fi
  done
}
resize
htmlify "head.htm_" "foot.htm_"
for subdir in ./*/ ; do
  cd $subdir
  echo "entering $(basename $PWD)"
  resize
  htmlify "../head.htm_" "../foot.htm_"
  echo "updating $(basename $PWD) favicon"
  cp -f ../favicon.ico favicon.ico
  echo "$(basename $PWD) favicon updated"
  cd ..
done
echo ">> resize log images"
cd log/pics
resize
cp -r -f ../pics ../entries
cd ../entries
echo "entering $(basename $PWD)"
echo "updating $(basename $PWD) favicon"
cp -f ../favicon.ico favicon.ico
echo "$(basename $PWD) favicon updated"