#!/bin/bash
echo ">> pushing update"

git add .
git commit -m 'daily update'
git push -u origin

echo ">> update completed"