cd ../gbg
echo ">> the glass bead game"
function htmlify() {
    for file in *.md; do
      file=${file%.*}
      folder=$(basename $(pwd))
      echo "building $folder $file"
      target=${file}.html
      cat $1 > ${target}
      cmark --unsafe ${file}.md >> ${target}
      cat $2 >> ${target}
      echo "$folder $file built"
    done
}
htmlify "../sub-head.htm_" "../gbg-foot.htm_"
for subdir in ./*/ ; do
  cd $subdir
  htmlify "../../sub-sub-head.htm_" "../../gbg-foot.htm_"
  cd ..
done