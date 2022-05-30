#!/usr/bin/env sh

# 发生错误时终止
set -e

# 构建
npm run build

# 进入构建文件夹
cd dist

git init
git checkout -b main
git add -A
git commit -m 'deploy'

git push -f git@github.com:F-loat/offscreen-canvas-demo.git main:gh-pages

cd -
