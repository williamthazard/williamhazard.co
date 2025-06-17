cd ../gbg
echo ">> the glass bead game"
function htmlify() {
  count=`ls -1 *.md 2>/dev/null | wc -l`
  if [ $count != 0 ]; then
    for file in *.md; do
      file=${file%.*}
      folder=$(basename $(pwd))
      echo "building $folder $file"
      target=index.html
      cat $1 > ${target}
      cmark --unsafe index.md >> ${target}
      cat $2 >> ${target}
      echo "$folder $file built"
    done
  else
      folder=$(basename $(pwd))
      echo("no markdown files detected in $folder")
  fi
}
htmlify "../sub-head.htm_" "../gbg-foot.htm_"
for subdir in ./*/ ; do
  cd $subdir
  htmlify "../../sub-sub-head.htm_" "../../gbg-foot.htm_"
  cd ..
done