echo ">> root .md to .html"
function htmlify() {
  list=$(ls -r ./*.md)
  fold=$(basename $(pwd))
  for file in $list ; do
    date=$(date -r ${file} +%D)
    file=${file:2}
    file=${file%.*}
    echo "$fold built"
    target=${file}.html
    cat $1 > ${target}
    cmark --unsafe ${file}.md >> ${target}
    cat $2 >> ${target}
    sed -i '' -e 's#DATE#'$date'#g' ${target}
  done
}
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
htmlify "head.htm_" "foot.htm_"
echo ">> build log, rss"
cd log
list=$(ls -r ./*/*.md)

log="log"

cat ../head.htm_ > ${log}.html
cat start_rss.xml_ > rss.xml

n=1

for file in $list ; do
  file=${file:2}
  subfile=${file%.*}
  folder=${subfile%\/*}
  name=${subfile#*\/}
  echo "$folder / $name"

  # convert md to html
  target=${file%.*}.html
  cat ../head.htm_ > ${target}
  echo "<p>${name}</p>" >> ${target}
  cmark ${file} >> ${target}
  cat ../foot.htm_ >> ${target}

  # paginate
  if [ $((n % 19)) == 0 ]; then
    echo "--- page ---"
    echo "<br/><p><a href=/${log}n.html>[further]</a></p>" >> ${log}.html
    cat end.htm_ >> ${log}.html
    log=$log"n"
    cat start.htm_ > ${log}.html
  fi
  ((n=n+1))

  # append to index
  echo "<p><a href=${target}>${name}</a></p>" >> ${log}.html
  cmark ${file} >> ${log}.html
  echo "<br/>" >> ${log}.html

  # append to rss
  echo "<item>" >> rss.xml
  echo "<title>${folder} / ${name}</title>" >> rss.xml
  echo "<link>https://williamhazard.co/${folder}/${name}.html</link>" >> rss.xml
  echo "<guid>https://williamhazard.co/${folder}/${name}.html</guid>" >> rss.xml
  echo "<description><![CDATA[" >> rss.xml
  cmark ${file} >> rss.xml
  echo "]]></description>" >> rss.xml
  date=$(date -r $file "+%a, %d %b %Y 11:11:11 EST")
  echo "<pubDate>$date</pubDate>" >> rss.xml 
  echo "</item>" >> rss.xml
done


cat ../foot.htm_ >> ${log}.html
cat end_rss.xml_ >> rss.xml
