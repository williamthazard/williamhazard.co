#!/bin/bash
set -e

echo ">> installing dependencies"
brew install cmark ffmpeg imagemagick pandoc git-lfs gh

echo ">> setting up git lfs"
git lfs install

echo ">> creating python venv"
python3 -m venv .venv

echo ">> installing python packages"
.venv/bin/pip install requests keyring selenium

echo ">> setup complete"
echo ">> next steps:"
echo "   - run 'gh auth login' to authenticate with GitHub"
echo "   - run 'python3 scripts/bs-post.py update-credentials' to store Bluesky credentials"
echo "   - run 'python3 scripts/izzzzi-post.py update-credentials' to store izzzzi credentials"
