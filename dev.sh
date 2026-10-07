## If dependencies not installed use  
#cd /Users/jared/Documents/GitHub/ResQPH ./dev.sh --install


#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
STOP_DB_ON_EXIT="${STOP_DB_ON_EXIT:-0}"
INSTALL_DEPS=0

BACKEND_PID=""
FRONTEND_PID=""
CLEANED_UP=0

usage() {
  cat <<USAGE
Run ResQPH local development services.

Usage:
  ./dev.sh [--install] [--stop-db-on-exit]

Options:
  --install          Install backend/frontend dependencies before starting.
  --stop-db-on-exit  Run docker compose down when this script exits.

Environment:
  BACKEND_PORT       Backend port. Default: 8000
  FRONTEND_PORT      Frontend port. Default: 5173
  STOP_DB_ON_EXIT    Set to 1 to stop MongoDB on exit.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_DEPS=1
      shift
      ;;
    --stop-db-on-exit)
      STOP_DB_ON_EXIT=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

backend_python() {
  if [[ -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
    printf '%s\n' "$ROOT_DIR/backend/.venv/bin/python"
  elif [[ -x "$ROOT_DIR/backend/.venv/Scripts/python.exe" ]]; then
    printf '%s\n' "$ROOT_DIR/backend/.venv/Scripts/python.exe"
  else
    return 1
  fi
}

ensure_env_files() {
  if [[ ! -f "$ROOT_DIR/backend/.env" && -f "$ROOT_DIR/backend/.env.example" ]]; then
    log "Creating backend/.env from backend/.env.example"
    cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
  fi

  if [[ ! -f "$ROOT_DIR/frontend/.env" && -f "$ROOT_DIR/frontend/.env.example" ]]; then
    log "Creating frontend/.env from frontend/.env.example"
    cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env"
  fi
}

ensure_backend_venv() {
  if backend_python >/dev/null 2>&1; then
    return 0
  fi

  log "Creating backend virtual environment"
  if command -v uv >/dev/null 2>&1; then
    (cd "$ROOT_DIR/backend" && uv venv --python 3.12 .venv)
  elif command -v python3.12 >/dev/null 2>&1; then
    (cd "$ROOT_DIR/backend" && python3.12 -m venv .venv)
  elif command -v py >/dev/null 2>&1; then
    (cd "$ROOT_DIR/backend" && py -3.12 -m venv .venv)
  else
    echo "Python 3.12 or uv is required to create backend/.venv." >&2
    exit 1
  fi
}

install_dependencies() {
  ensure_backend_venv
  local py
  py="$(backend_python)"

  log "Installing backend dependencies"
  if command -v uv >/dev/null 2>&1; then
    (cd "$ROOT_DIR/backend" && uv pip install --python "$py" -r requirements.txt -r requirements-dev.txt)
  else
    "$py" -m pip install --upgrade pip
    (cd "$ROOT_DIR/backend" && "$py" -m pip install -r requirements.txt -r requirements-dev.txt)
  fi

  log "Installing frontend dependencies"
  (cd "$ROOT_DIR/frontend" && npm install)
}

install_local_routing_package() {
  local py
  py="$(backend_python)"

  log "Installing local routing package in editable mode"
  if command -v uv >/dev/null 2>&1; then
    uv pip install --python "$py" -e "$ROOT_DIR/routing"
  else
    "$py" -m ensurepip --upgrade >/dev/null 2>&1 || true
    "$py" -m pip install -e "$ROOT_DIR/routing"
  fi
}

ensure_local_routing_package() {
  local py
  py="$(backend_python)"

  if "$py" - "$ROOT_DIR" <<'PY'
import inspect
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
expected = (root / "routing" / "src").resolve()

try:
    import resqph_routing
except Exception:
    raise SystemExit(1)

package_path = Path(inspect.getfile(resqph_routing)).resolve()
has_required_api = hasattr(resqph_routing, "find_shortest_distance_route")
if expected not in package_path.parents or not has_required_api:
    raise SystemExit(1)
PY
  then
    return 0
  fi

  install_local_routing_package
}

verify_backend_import() {
  local py
  py="$(backend_python)"

  log "Verifying backend imports"
  (cd "$ROOT_DIR/backend" && "$py" - <<'PY'
import app.main
PY
  )
}

detect_host_ip() {
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null && return 0
    ipconfig getifaddr en1 2>/dev/null && return 0
  fi
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}' && return 0
  fi
  printf '127.0.0.1\n'
}

mongodb_uri_is_ready() {
  local uri="$1"
  local py
  py="$(backend_python)"

  "$py" - "$uri" <<'PY'
import asyncio
import sys

from pymongo import AsyncMongoClient


async def main() -> int:
    uri = sys.argv[1]
    client = AsyncMongoClient(uri, serverSelectionTimeoutMS=2000)
    try:
        hello = await client.admin.command("hello")
    finally:
        await client.close()
    if hello.get("setName") != "rs0" or not hello.get("isWritablePrimary"):
        return 1
    return 0


raise SystemExit(asyncio.run(main()))
PY
}

select_mongodb_uri() {
  if [[ -n "${MONGODB_URI:-}" ]]; then
    log "Using MONGODB_URI from the environment"
    return 0
  fi

  local host_ip
  host_ip="$(detect_host_ip)"
  local candidates=(
    "mongodb://localhost:27017/?replicaSet=rs0"
    "mongodb://127.0.0.1:27017/?replicaSet=rs0"
  )
  if [[ -n "$host_ip" && "$host_ip" != "127.0.0.1" ]]; then
    candidates+=("mongodb://${host_ip}:27017/?replicaSet=rs0&directConnection=true")
  fi

  local uri
  for uri in "${candidates[@]}"; do
    if mongodb_uri_is_ready "$uri" >/dev/null 2>&1; then
      export MONGODB_URI="$uri"
      log "Using MongoDB URI: $uri"
      return 0
    fi
  done

  echo "MongoDB is running, but the backend could not reach the rs0 replica set." >&2
  echo "If another local mongod owns localhost:27017, stop it or set MONGODB_URI explicitly." >&2
  exit 1
}

wait_for_backend() {
  local py
  py="$(backend_python)"

  log "Waiting for backend health endpoint"
  for _ in {1..60}; do
    if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
      echo "Backend process exited before becoming ready." >&2
      exit 1
    fi
    if "$py" - "$BACKEND_PORT" <<'PY' >/dev/null 2>&1
import sys
import urllib.request

port = sys.argv[1]
with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/v1/health", timeout=1) as response:
    raise SystemExit(0 if response.status == 200 else 1)
PY
    then
      return 0
    fi
    sleep 1
  done

  echo "Backend did not become ready within 60 seconds." >&2
  exit 1
}

wait_for_mongodb() {
  log "Waiting for MongoDB replica set"
  for _ in {1..60}; do
    if docker compose exec -T mongodb mongosh --quiet --eval \
      "try { rs.status().ok } catch (error) { rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]}).ok }" \
      2>/dev/null | grep -q "1"; then
      return 0
    fi
    sleep 1
  done

  echo "MongoDB did not become ready within 60 seconds." >&2
  exit 1
}

cleanup() {
  if [[ "$CLEANED_UP" == "1" ]]; then
    return 0
  fi
  CLEANED_UP=1

  log "Stopping local dev servers"
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true

  if [[ "$STOP_DB_ON_EXIT" == "1" ]]; then
    log "Stopping MongoDB"
    (cd "$ROOT_DIR" && docker compose down)
  else
    log "MongoDB is still running. Use 'docker compose down' to stop it."
  fi
}

trap cleanup EXIT INT TERM

require_command docker
require_command npm
ensure_env_files

if [[ "$INSTALL_DEPS" == "1" ]]; then
  install_dependencies
else
  ensure_backend_venv
fi

PYTHON_BIN="$(backend_python)"
ensure_local_routing_package
verify_backend_import

if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
  echo "frontend/node_modules is missing. Run './dev.sh --install' first." >&2
  exit 1
fi

log "Starting MongoDB"
(cd "$ROOT_DIR" && docker compose up -d mongodb)
wait_for_mongodb
select_mongodb_uri

log "Starting backend on http://localhost:${BACKEND_PORT}"
(cd "$ROOT_DIR/backend" && "$PYTHON_BIN" -m fastapi dev app/main.py --port "$BACKEND_PORT") &
BACKEND_PID=$!
wait_for_backend

log "Starting frontend on http://localhost:${FRONTEND_PORT}"
(cd "$ROOT_DIR/frontend" && npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

log "Ready"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "API docs: http://localhost:${BACKEND_PORT}/docs"
echo "Press Ctrl+C to stop frontend/backend."

wait "$BACKEND_PID" "$FRONTEND_PID"
