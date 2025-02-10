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
    image="pics/${file}.jpeg"
    toot post $text --media $image --description $text
  fi
}
function post() {
  echo ">> posting today's entry to Bluesky & Mastodon"
  text=$(cat ${file}.txt)
  if [ -e pics/$file.jpeg ]; then
    image="pics/${file}.jpeg"
    toot post $text --media $image --description $text
  elif [ -e pics/$file.png ] ; then
    image="pics/${file}.png"
    toot post $text --media $image --description $text
  else
    image=""
    toot post $text
  fi
  python ../../scripts/bs-post.py "${text}" "${image}" "an image"
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