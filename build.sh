echo ">> root .md to .html"

list=$(ls -r ./*.md)
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd words
echo "entering words folder"
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat ../head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd ..
cd sounds
echo "entering sounds folder"
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat ../head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd ..
cd videos
echo "entering videos folder"
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat ../head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd ..
cd code
echo "entering code folder"
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat ../head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd ..
cd performances
echo "entering performances folder"
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat ../head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd ..
cd log
echo "entering log folder"
for file in $list ; do
  date=$(date -r ${file} +%D)
  file=${file:2}
  file=${file%.*}
  echo "$file"
  target=${file}.html
  cat ../head.htm_ > ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../foot.htm_ >> ${target}
  sed -i '' -e 's#DATE#'$date'#g' ${target}
done
cd ..