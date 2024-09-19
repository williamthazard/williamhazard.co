echo ">> check log entry dates"
cd ../log/entries
marks=(*.md)
for file in $marks ; do
  old_date=${file%-*}
  old_date=${old_date%-*}
  old_date=${old_date%-*}
  old_date=${old_date%.*}
  time=$(date -r ${file} +%H%M%S)
  old_date="${old_date}${time}"
  new_date=$(date -j -f "%y%m%d%H%M%S" ${old_date} +%Y-%m-%d%H:%M:%S)
  touch -d ${new_date} ${file}
  file=${file%.*}
  echo "entry: ${file} | date: ${new_date}"
done
cd ../../scripts