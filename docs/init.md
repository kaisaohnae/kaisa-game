# init 

```
Remove-Item -Recurse -Force .git
git init
git add .
git commit -m "init"
git remote add origin "https://github.com/kaisaohnae/kaisa-game.git"
git branch -M main
git push -u --force origin main
```