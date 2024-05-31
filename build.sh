echo ">> root .md to .html"
function htmlify() {
  for file in *.md ; do
    date=$(date -r ${file} +%D)
    file=${file%.*}
    echo "building $file"
    target=${file}.html
    cat $1 > ${target}
    cmark --unsafe ${file}.md >> ${target}
    cat $2 >> ${target}
    sed -i '' -e 's#DATE#'$date'#g' ${target}
    echo "$file built"
  done
}
function resize() {
  for file in *.jpeg ; do
    file=${file%.*}
    mogrify -resize 800x450^ -gravity center -extent 16:9 -strip ${file}.jpeg
    echo "$file converted"
  done
}
htmlify "head.htm_" "foot.htm_"
mogrify -resize 800x450^ -gravity center -extent 16:9 -strip *.jpeg
for subdir in ./*/ ; do
  cd $subdir
  htmlify "../head.htm_" "../foot.htm_"
  mogrify -resize 800x450^ -gravity center -extent 16:9 -strip *.jpeg
  cd ..
done

echo ">> convert images"
cd log/pics
resize
cd ..
cd entries/pics
resize
cd ..

echo ">> build rss"
log="log"

cat ../../head.htm_ > ../${log}.html
cat ../start_rss.xml_ > ../rss.xml

n=1

marks=(*.md)
min=1
max=$(( ${#marks[@]} ))
while [[ min -lt max ]] ; do
    # Swap current first and last elements
    x="${marks[$min]}"
    marks[$min]="${marks[$max]}"
    marks[$max]="$x"

    # Move closer
    (( min++, max-- ))
done

for file in $marks ; do
  # convert md to html
  date=$(date -r ${file} +%D)
  file=${file%.*}
  name=${file#*/}
  folder=$(basename $(pwd))
  target=${file}.html
  cat ../../head.htm_ > ${target}
  echo "<p>${name}</p>" >> ${target}
  cmark --unsafe ${file}.md >> ${target}
  cat ../../log-foot.htm_ >> ${target}
  echo $name

  # paginate
  if [[ $((n % 10)) == 0 ]]; then
    echo "<br/><p><a href=../log/${log}n.html>[further]</a></p>" >> ../${log}.html
    cat ../../log-foot.htm_ >> ../${log}.html
    log=$log"n"
    cat ../../head.htm_ > ../${log}.html
  fi
  ((n=n+1))

  # append to index
  echo "<p><a href=entries/${target}>${name}</a></p>" >> ../${log}.html
  cmark --unsafe ${file}.md >> ../${log}.html
  echo "<br/>" >> ../${log}.html

  # append to rss
  echo "<item>" >> ../rss.xml
  echo "<title>log / ${name}</title>" >> ../rss.xml
  echo "<link>https://williamhazard.co/log/${folder}/${name}.html</link>" >> ../rss.xml
  echo "<guid>https://williamhazard.co/log/${folder}/${name}.html</guid>" >> ../rss.xml
  echo "<description><![CDATA[" >> ../rss.xml
  cmark --unsafe ${file}.md >> ../rss.xml
  echo "]]></description>" >> ../rss.xml
  date=$(date -r ${file}.md "+%a, %d %b %Y 11:11:11 EST")
  echo "<pubDate>$date</pubDate>" >> ../rss.xml 
  echo "</item>" >> ../rss.xml
done

cat ../../log-foot.htm_ >> ../${log}.html
date=$(date -r ../${log}.html +%D)
sed -i '' -e 's#DATE#'$date'#g' ../${log}.html
cat ../end_rss.xml_ >> ../rss.xml