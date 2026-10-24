#!/bin/bash
# 一键更新 talks 仓库里的西安站 deck：
#   1) 把主工程最新产物同步进仓库（覆盖同名、删除多余）
#   2) 自动递增 index.html 里的资源版本号 ?v=，破除浏览器/CDN 缓存
#   3) 提交并推送到 GitHub（Pages 会自动重新部署）
#
# 用法：
#   ./update-deck.sh                 # 版本号用当天日期
#   ./update-deck.sh 20261107        # 指定版本号
#   ./update-deck.sh 20261107 "改了第16页文案"   # 指定版本号 + 提交说明
set -e

SRC="/Users/nickxyang/WorkBuddy/2026-10-15-14-23-52/outputs/opentenbase-xian-deck"
REPO="/Users/nickxyang/WorkBuddy/2026-10-15-14-23-52/outputs/talks"
DST="$REPO/opentenbase-xian-2026"
V="${1:-$(date +%Y%m%d)}"
MSG="${2:-西安站 deck 更新（v=$V）}"

echo "→ 同步产物：$SRC → $DST"
rsync -a --delete --exclude tools --exclude .workbuddy "$SRC/" "$DST/"

echo "→ 递增资源版本号为 ?v=$V"
LC_ALL=C sed -i.bak -E "s/\?v=[0-9A-Za-z]+/?v=$V/g" "$DST/index.html" && rm -f "$DST/index.html.bak"

cd "$REPO"
git add -A
if git diff --cached --quiet; then
  echo "· 内容无变化，跳过提交"
  exit 0
fi

git commit -m "$MSG"
git push origin main
echo "✅ 已推送：https://github.com/Nickyoung0/talks （Pages 约 1–3 分钟后生效）"
