#!/bin/bash
echo ">> pushing update"

com='update'
date=$(date)
comdate=($com $date)

git add .
git commit -m $comdate
git push -u origin

echo ">> update completed"