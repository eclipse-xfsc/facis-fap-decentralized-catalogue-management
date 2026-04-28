#!/usr/bin/env bash
set -Eeuo pipefail

export ENGINE="https://ionos.facis.cloud/enginedcm"

ENGINE_TOKEN="$(
  curl -sS -k --http1.1 -X POST "${ENGINE}/auth/token" \
    -H "Content-Type: application/json" \
    -d "{\"client_id\":\"node-red-admin\",\"grant_type\":\"password\",\"scope\":\"*\",\"username\":\"${ENGINE_USERNAME}\",\"password\":\"${ENGINE_PASSWORD}\"}" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'
)"
test -n "${ENGINE_TOKEN}"

export DEST_URL="${ENGINE}/backendtest"

cd ../..
npm install
export INSECURE=1
npm run build

API_URL="${DEST_URL:-}"
if [[ -z "${API_URL}" ]]; then
  echo "ERROR: API_URL is empty. Example:"
  echo "API_URL='${API_URL}' npm run build"
  exit 1
fi

DIST_DIR="./public"

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "ERROR: index.html not found in DIST_DIR='${DIST_DIR}'" >&2
  exit 1
fi

command -v zip >/dev/null 2>&1 || { echo "ERROR: zip not installed"; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "ERROR: unzip not installed"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

cp -a "${DIST_DIR}" "${TMP}/dist"

(
  cd "${TMP}"
  zip -qr dist.zip dist
  unzip -t dist.zip >/dev/null
)

ZIP_FILE="${TMP}/dist.zip"

curl_args=(
  -sS
  -k
  --http1.1
  --retry 3
  --retry-delay 2
  --retry-connrefused
  -o "${TMP}/response.out"
  -D "${TMP}/headers.out"
  -w '%{http_code}'
  -X POST
  "${API_URL}"
  -H 'Content-Type: application/octet-stream'
  -H 'Expect:'
  --data-binary "@${ZIP_FILE}"
)

if [[ "${INSECURE:-0}" == "1" ]]; then
  curl_args=(-k "${curl_args[@]}")
fi

HTTP_CODE="$(curl "${curl_args[@]}")"
echo "HTTP ${HTTP_CODE}"
head -c 400 "${TMP}/response.out" || true
echo

case "${HTTP_CODE}" in
  200|201|202|204) echo "OK: upload succeeded" ;;
  *) echo "ERROR: upload failed"; sed -n '1,200p' "${TMP}/headers.out" || true; exit 1 ;;
esac


curl -k -X POST "${ENGINE}/flows" \
    -H "Authorization: Bearer ${ENGINE_TOKEN}" \
    -H "Content-Type: application/json" \
    --data @backend/src/full_assembled_out_flow.json

exit 0;
