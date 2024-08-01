#!/bin/bash
cd scripts
zsh ./build.sh
cd ..

echo ">> pushing update"

git add .
git commit -m 'update'
git push -u origin

echo ">> update completed"