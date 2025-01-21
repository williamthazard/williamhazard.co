echo ">> check log entry dates"
cd ../log/entries
marks=(*.md)
function dateCheck() {
  if [ $1 == $2 ]; then
    textCheck
  fi
}
function textCheck() {
  if [ -e $file.txt ]; then
    echo "${file} has already been posted to Bluesky"
  else
    pandoc  --from markdown --to plain -o ${file}.txt ${file}.md
    charCheck
  fi
}
function charCheck() {
  characters=$(wc -c < ${file}.txt)
  if [ $characters -le 300 ]; then
    bsPost
  else
    echo "${file} is too long for Bluesky"
  fi
}
function bsPost() {
  echo ">> posting today's entry to Bluesky"
  python ../../scripts/bs-post.py "$(cat ${file}.txt)" "${image}" "an image"
}
for file in $marks ; do
  old_date=${file%-*}
  old_date=${old_date%-*}
  old_date=${old_date%-*}
  old_date=${old_date%.*}
  current=$(date +%H%M%S)
  time=$(date -r ${file} +%H%M%S)
  old_date="${old_date}${time}"
  new_date=$(date -j -f "%y%m%d%H%M%S" ${old_date} +%Y-%m-%d%H:%M:%S)
  touch -d ${new_date} ${file}
  file=${file%.*}
  echo "${file} | date: ${new_date}"
  if [ -e pics/$file.jpeg ]; then
    image="pics/${file}.jpeg"
  else
    image=""
  fi
  dateCheck ${current} ${old_date}
done
cd ../../scripts