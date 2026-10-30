#!/bin/sh
# Khởi động HUE Research trong container: chuẩn bị khoá bí mật, địa chỉ gốc và nạp dữ liệu lần đầu.
set -e

DB_PATH="${HCE_DB_PATH:-/data/hce.db}"
DATA_DIR="$(dirname "$DB_PATH")"

# 0) Container khởi động bằng root để sửa quyền thư mục dữ liệu (ổ đĩa gắn ngoài như Render Disk thường thuộc root),
#    rồi chạy ứng dụng bằng người dùng "node" (không đặc quyền).
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR" 2>/dev/null || true
  exec env HOME=/home/node setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi

mkdir -p "$DATA_DIR"

# 1) Khoá bí mật cho đăng nhập: nếu chưa đặt BETTER_AUTH_SECRET thì tự sinh và lưu lại để phiên không mất sau khi khởi động lại.
if [ -z "$BETTER_AUTH_SECRET" ]; then
  SECRET_FILE="$DATA_DIR/.auth-secret"
  if [ ! -s "$SECRET_FILE" ]; then
    head -c 48 /dev/urandom | base64 | tr -d '\n' > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
  fi
  BETTER_AUTH_SECRET="$(cat "$SECRET_FILE")"
  export BETTER_AUTH_SECRET
fi

# 2) Địa chỉ gốc (dùng cho liên kết đăng nhập và callback OAuth).
if [ -z "$BETTER_AUTH_URL" ]; then
  if [ -n "$RENDER_EXTERNAL_URL" ]; then
    BETTER_AUTH_URL="$RENDER_EXTERNAL_URL"
  else
    BETTER_AUTH_URL="http://localhost:${PORT:-3100}"
  fi
  export BETTER_AUTH_URL
fi

# 3) Nạp dữ liệu lần đầu (chạy nền để máy chủ lên ngay). Đặt SEED_ON_START=0 để tắt.
#    Tiến trình ghi nhật ký vào $DATA_DIR/seed.log; chỉ đánh dấu hoàn tất nếu mọi bước thành công.
if [ "${SEED_ON_START:-1}" = "1" ] && [ ! -f "$DATA_DIR/.seeded" ]; then
  (
    cd "${APP_DIR:-/app}"
    ok=1
    for step in \
      "scripts/sync-hueuni.mjs" \
      "scripts/sync-hce-forms.mjs" \
      "scripts/sync-eu-funding.mjs" \
      "scripts/journals.mjs vn2244" \
      "scripts/journals.mjs doaj"; do
      echo "=== node $step ($(date -u +%FT%TZ))"
      # shellcheck disable=SC2086
      node $step || ok=0
    done
    [ "$ok" = "1" ] && touch "$DATA_DIR/.seeded"
    echo "=== seed xong, ok=$ok"
  ) > "$DATA_DIR/seed.log" 2>&1 &
fi

exec "$@"
