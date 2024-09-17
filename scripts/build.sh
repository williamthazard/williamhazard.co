echo ">> build site"
zsh ./vidflip.sh
zsh ./imgflip.sh
zsh ./htmlify.sh
zsh ./redate.sh
zsh ./build-rss.sh
echo ">> site build complete"