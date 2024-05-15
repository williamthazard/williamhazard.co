#!/bin/bash
zsh ./build.sh

echo ">> pushing update"

git add .
git commit -m 'update'
git push -u origin

echo ">> update completed"