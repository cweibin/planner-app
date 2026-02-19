#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="${ROOT_DIR}/deploy/artifacts"

ensure_node_modules() {
  local dir="$1"
  if [ ! -d "${dir}/node_modules" ]; then
    if [ -f "${dir}/package-lock.json" ]; then
      (cd "$dir" && npm ci)
    else
      (cd "$dir" && npm install)
    fi
  fi
}

mkdir -p "$ARTIFACT_DIR"

echo "==> Building web (frontend/web)"
ensure_node_modules "${ROOT_DIR}/frontend/web"
(cd "${ROOT_DIR}/frontend/web" && npm run build)

if [ ! -d "${ROOT_DIR}/frontend/web/dist" ]; then
  echo "Web build output not found: frontend/web/dist" >&2
  exit 1
fi

echo "==> Building mobile H5 (frontend/mobile)"
ensure_node_modules "${ROOT_DIR}/frontend/mobile"
(cd "${ROOT_DIR}/frontend/mobile" && npm run build:h5)

if [ ! -d "${ROOT_DIR}/frontend/mobile/dist/build/h5" ]; then
  echo "Mobile H5 build output not found: frontend/mobile/dist/build/h5" >&2
  exit 1
fi

echo "==> Packaging artifacts"
rm -f "${ARTIFACT_DIR}/web-dist.tar.gz" "${ARTIFACT_DIR}/mobile-h5-dist.tar.gz"
tar -czf "${ARTIFACT_DIR}/web-dist.tar.gz" -C "${ROOT_DIR}/frontend/web" dist
tar -czf "${ARTIFACT_DIR}/mobile-h5-dist.tar.gz" -C "${ROOT_DIR}/frontend/mobile/dist/build" h5

echo "==> Done"
ls -lh "${ARTIFACT_DIR}/web-dist.tar.gz" "${ARTIFACT_DIR}/mobile-h5-dist.tar.gz"
