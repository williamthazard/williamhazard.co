echo ">> check log entry dates"
cd ../log/entries
marks=(*.md)
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
  if [[ $current == $old_date ]]; then
    echo ">> posting today's entry to BlueSky"
    pandoc  --from markdown --to plain -o ${file}.txt ${file}
    python ../../scripts/bs-post.py "$(cat ${file}.txt)" <<limitString

limitString
    rm ${file}.txt
  fi
done
cd ../../scripts