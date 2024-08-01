#!/bin/bash
zsh scripts/build.sh

echo ">> pushing update"

git add .
git commit -m 'update'
git push -u origin

echo ">> update completed"