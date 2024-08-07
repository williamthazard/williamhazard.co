cd ..
echo ">> root .md to .html"
function htmlify() {
  for file in *.md; do
    file=${file%.*}
    date=$(date -r ${file}.md +%y%m%d)
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
htmlify "head.htm_" "foot.htm_"
for subdir in ./*/ ; do
  cd $subdir
  htmlify "../sub-head.htm_" "../foot.htm_"
  cd ..
done