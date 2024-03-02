echo 'Start commit'
echo $1
git add .
git commit -m "$1"
echo 'End commit'