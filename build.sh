echo ">> root .md to .html"
list=$(ls -r ./*.md)
function htmlify() {
  fold=$(basename $(pwd))
  for file in $list ; do
    date=$(date -r ${file} +%D)
    file=${file:2}
    file=${file%.*}
    echo "$fold $file built"
    target=${file}.html
    cat $1 > ${target}
    cmark --unsafe ${file}.md >> ${target}
    cat $2 >> ${target}
    sed -i '' -e 's#DATE#'$date'#g' ${target}
  done
}
htmlify "head.htm_" "foot.htm_"
cd words
htmlify "../head.htm_" "../foot.htm_"
cd ..
cd sounds
htmlify "../head.htm_" "../foot.htm_"
cd ..
cd videos
htmlify "../head.htm_" "../foot.htm_"
cd ..
cd code
htmlify "../head.htm_" "../foot.htm_"
cd ..
cd performances
htmlify "../head.htm_" "../foot.htm_"
cd ..
cd log
htmlify "../head.htm_" "../foot.htm_"
cd ..