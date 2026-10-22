#!/usr/bin/env bash
# Áp toàn bộ migration lên một Postgres tạm trong Docker rồi chạy rls.test.sql.
# Thoát với mã khác 0 nếu có ca kiểm thử thất bại. Dùng được trên máy dev và trong CI.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
NAME="sportarena-dbtest-$$"
IMAGE="${PG_IMAGE:-postgres:16}"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=pw "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  # Image postgres khởi động 2 lần (init rồi chạy thật), nên phải thử kết nối thật chứ không chỉ pg_isready
  if docker exec "$NAME" psql -U postgres -tAc 'select 1' >/dev/null 2>&1; then break; fi
  sleep 1
done

psql_run() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "▶ Dựng role/schema giả lập Supabase"
apply() {
  local out
  out="$(psql_run < "$1" 2>&1)" || { echo "$out"; echo "✗ Lỗi khi áp $1"; exit 1; }
  echo "$out" | grep -v -E "^(NOTICE|DETAIL|WARNING|HINT)" || true
}
apply "$HERE/stub.sql"

for f in $(ls "$MIGRATIONS"/*.sql | sort); do
  echo "▶ Migration $(basename "$f")"
  apply "$f"
done

echo "▶ Chạy kiểm thử bảo mật"
psql_run < "$HERE/rls.test.sql" 2>&1 | grep -v -E "^(DETAIL|HINT)" ; exit "${PIPESTATUS[0]}"
