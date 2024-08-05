#!/bin/bash
cd scripts
zsh ./build.sh
cd ..

echo ">> clearing worktree"
rm -f .git/index.lock
echo ">> worktree cleared"

echo ">> pushing update"
git add .
git commit -m 'update'
git push -u origin
echo ">> update complete"