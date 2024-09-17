cd ../log/entries
marks=(*.md)
for file in $marks ; do
  old_date=${file%-*}
  old_date=${old_date%-*}
  old_date=${old_date%-*}
  old_date=${old_date%.*}
  old_date="${old_date}111111"
  new_date=$(date -j -f "%y%m%d%H%M%S" ${old_date} +%Y-%m-%d%H:%M:%S)
  touch -d ${new_date} ${file}
  file=${file%.*}
done
cd ../../scripts