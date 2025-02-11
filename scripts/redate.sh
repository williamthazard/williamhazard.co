echo ">> check log entry dates"
cd ../log/entries
marks=(*.md)
function dateCheck() {
  if [[ $current == $old_date ]]; then
    textCheck
  fi
}
function textCheck() {
  if [ -e $file.txt ]; then
    echo "${file} has already been posted to socials"
  else
    pandoc  --from markdown --to plain -o ${file}.txt ${file}.md
    charCheck
  fi
}
function charCheck() {
  characters=$(wc -c < ${file}.txt)
  if [ $characters -le 300 ]; then
    post
  else
    echo "${file} is too long for Bluesky"
    echo "posting to Mastodon"
    text=$(cat ${file}.txt)
    mark=$(cat ${file}.md)
    cat $(tail -n 1 ${file}.md) > ${file}-tail.md
    imgmark=$(cat ${file}-tail.md)
    image="pics/${file}.jpeg"
    toot post $text --media $image --description $text
    if [ -e pics/$file.jpeg ]; then
    echo "posting to izzzzi" 
      python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
    else
      python ../../scripts/izzzzi-post.py "${mark}" "${image}"
    fi
  fi
  rm ${file}-tail.md
}
function post() {
  echo ">> posting today's entry to Bluesky & Mastodon"
  text=$(cat ${file}.txt)
  mark=$(cat ${file}.md)
  cat $(tail -n 1 ${file}.md) > ${file}-tail.md
  imgmark=$(cat ${file}-tail.md)
  if [ -e pics/$file.jpeg ]; then
    image="pics/${file}.jpeg"
    echo "posting to Mastodon"
    toot post $text --media $image --description $text
    echo "posting to izzzzi"
    python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
  elif [ -e pics/$file.png ] ; then
    image="pics/${file}.png"
    echo "posting to Mastodon"
    toot post $text --media $image --description $text
    echo "posting to izzzzi"
    python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
  else
    image=""
    echo "posting to Mastodon"
    toot post $text
    echo "posting to izzzzi"
    python ../../scripts/izzzzi-post.py "${mark}" "${image}"
  fi
  python ../../scripts/bs-post.py "${text}" "${image}" "${text}"
  rm ${file}-tail.md
}
for file in $marks ; do
  old_date=${file%-*}
  old_date=${old_date%-*}
  old_date=${old_date%-*}
  old_date=${old_date%.*}
  current=$(date +%y%m%d)
  time=$(date -r ${file} +%H%M%S)
  timed_date="${old_date}${time}"
  new_date=$(date -j -f "%y%m%d%H%M%S" ${timed_date} +%Y-%m-%d%H:%M:%S)
  touch -d ${new_date} ${file}
  file=${file%.*}
  echo "${file} | date: ${new_date}"
  dateCheck
done
cd ../../scripts