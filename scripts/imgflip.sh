cd ..
echo ">> resize page images"
function resize() {
  for file in *; do
    file=${file%.*}
    if [ -e $file.jpeg ]; then
      mogrify -resize 800x450^ -gravity center -extent 16:9 -strip ${file}.jpeg
      echo "$file.jpeg resized"
    fi
  done
}
resize
for subdir in ./*/ ; do
  cd $subdir
  resize
  cd ..
done
echo ">> resize log images"
cd log/pics
resize
cp -r -f ../pics ../entries