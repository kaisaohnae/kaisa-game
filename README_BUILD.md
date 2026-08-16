## 방법1. 깃헙에 정적페이지로 배포할경우...

```
npm run build
cd out
touch .nojekyll
echo 'kaisa.co.kr' > CNAME
git init
git checkout -b main
git add -A
git commit -m 'deploy'
git remote add origin "https://github.com/kaisaohnae/kaisa-game.git"
git push -u --force origin main
rm -rf .git
cd ..
```

## 방법2. (현재 사용중)

```
mkdir -p .github/workflows
touch .github/workflows/deploy.yml

저장소의 설정 → Actions → General → Workflow permissions에서 Read and write permissions로 설정되어 있는지 확인합니다. (해야함)

GitHub Pages 에 gh-pages 로 설정 

```

## 로컬 환경 이그노어
```
.env.development.local
```

### vue3 와 비교 
```
깃헙 pushstate 에 대한 url 관리는 next js 가 유리  
```

## 배포 후 조치
```
배포하고 풀 받아야함
```
