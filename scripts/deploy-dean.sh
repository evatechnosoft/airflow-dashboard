#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/DATA/projects/apiflow-monitor"
BRANCH="${1:-test}"

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "[deploy] cloning repository into $PROJECT_DIR"
  sudo rm -rf "$PROJECT_DIR"
  git clone --branch "$BRANCH" git@github.com:evatechnosoft/airflow-dashboard.git "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
echo "[deploy] pulling latest branch: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] restarting compose stack"
sudo HOME="$PWD" docker compose up -d --build

echo "[deploy] status"
sudo HOME="$PWD" docker compose ps
