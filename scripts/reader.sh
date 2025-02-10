#!/bin/bash
dataFile='../log/entries/250210.md'
Counter=0

while IFS= read -r line; do
    if [ $Counter -ge 1 ]; then
        # Process each line here
        echo "$line"
    fi
    Counter=$((Counter + 1))
done < "$dataFile"