#!/bin/bash
# Chuẩn bị môi trường Codespaces: cài thư viện, tạo .env.local và nạp dữ liệu nền.
set -e
cd "$(dirname "$0")/../hce-research"

# better-sqlite3 có thể phải biên dịch: bảo đảm có trình biên dịch.
if ! command -v g++ >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y --no-install-recommends python3 make g++
fi

npm ci

if [ ! -f .env.local ]; then
  if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    BASE_URL="https://${CODESPACE_NAME}-3100.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  else
    BASE_URL="http://localhost:3100"
  fi
  {
    echo "BETTER_AUTH_URL=${BASE_URL}"
    echo "BETTER_AUTH_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  } > .env.local
fi

# Nạp dữ liệu thật ở chế độ nền (vài phút); theo dõi bằng: tail -f hce-research/data/seed.log
mkdir -p data
(
  npm run sync:hueuni
  npm run sync:forms
  npm run sync:eu
  npm run journals:vn
  npm run journals:doaj
) > data/seed.log 2>&1 &
disown || true
