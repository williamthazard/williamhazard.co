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
  text=$(cat ${file}.txt)
  mark=$(cat ${file}.md)
  tail -n 1 ${file}.md > ${file}-tail.md
  imgmark=$(cat ${file}-tail.md)
  if [ $characters -le 300 ]; then
    post
  else
    echo ">> ${file} is too long for Bluesky"
    echo ">> posting ${file} to Mastodon and izzzzi"
    if [ -e pics/$file.jpeg ]; then
      image="pics/${file}.jpeg" 
      python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
      toot post $text --media $image --description $text
    elif [ -e pics/$file.png ] ; then
      image="pics/${file}.png"
      python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
      toot post $text --media $image --description $text
    else
      python ../../scripts/izzzzi-post.py "${mark}"
      toot post $text
    fi
    rm ${file}-tail.md
  fi
}
function post() {
  echo ">> posting ${file} to Bluesky, Mastodon, and izzzzi"
  if [ -e pics/$file.jpeg ]; then
    image="pics/${file}.jpeg"
    python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
    toot post $text --media $image --description $text
  elif [ -e pics/$file.png ] ; then
    image="pics/${file}.png"
    python ../../scripts/izzzzi-post.py "${imgmark}" "${image}"
    toot post $text --media $image --description $text
  else
    image=""
    python ../../scripts/izzzzi-post.py "${mark}" "${image}"
    toot post $text
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