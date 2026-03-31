#!/bin/bash
# ops-scheduler-cron.sh — Cross-platform cron automation for apiflow-monitor-mvp ops system
# Install: run this script with 'install' parameter to register cron jobs
# Uninstall: run with 'uninstall' parameter

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_FILE="${PROJECT_ROOT}/config/.ops-config.json"
LOG_DIR="${PROJECT_ROOT}/output/logs"

mkdir -p "$LOG_DIR"

# Parse config
get_config_value() {
  local key="$1"
  local default="${2:-}"
  if command -v jq &> /dev/null; then
    jq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
  else
    grep "\"$key\"" "$CONFIG_FILE" | head -1 | cut -d':' -f2 | tr -d ' \",' || echo "$default"
  fi
}

BACKUP_ENABLED=$(get_config_value '.backup.enabled' "true")
BACKUP_TIME=$(get_config_value '.backup.schedule.time' "02:00")
RESTORE_SCHEDULE=$(get_config_value '.restore.validateManifest' "true")
HEALTH_ENABLED=$(get_config_value '.health.enabled' "true")

# Convert HH:MM to cron format (hour minute)
time_to_cron() {
  local time="$1"
  echo "$time" | awk -F: '{print $2" "$1}'
}

# Generate cron entry
generate_backup_cron() {
  local cron_time=$(time_to_cron "$BACKUP_TIME")
  echo "$cron_time * * * cd '$PROJECT_ROOT' && npm run ops:backup >> '$LOG_DIR/ops-backup.log' 2>&1"
}

generate_restore_cron() {
  # Saturday @ 03:00 (3 0 * * 6)
  echo "0 3 * * 6 cd '$PROJECT_ROOT' && npm run ops:restore-test >> '$LOG_DIR/ops-restore-test.log' 2>&1"
}

generate_health_cron() {
  # Every 4 hours starting 06:00 (0 6,10,14,18,22 * * *)
  echo "0 6,10,14,18,22 * * * cd '$PROJECT_ROOT' && npm run ops:health-report >> '$LOG_DIR/ops-health-report.log' 2>&1"
}

# Install cron jobs
install_crons() {
  echo "[ops-scheduler] Installing cron jobs for $PROJECT_ROOT..."
  
  local crontab_file="/tmp/apiflow-ops-crontab.$$"
  local installed=0
  
  # Get current crontab (if exists)
  crontab -l > "$crontab_file" 2>/dev/null || true
  
  # Check and add backup job
  if [ "$BACKUP_ENABLED" = "true" ]; then
    local backup_cron=$(generate_backup_cron)
    if ! grep -q "ops:backup" "$crontab_file" 2>/dev/null; then
      echo "$backup_cron" >> "$crontab_file"
      installed=$((installed + 1))
      echo "  ✓ Backup job: daily @ $BACKUP_TIME"
    fi
  fi
  
  # Check and add restore job
  local restore_cron=$(generate_restore_cron)
  if ! grep -q "ops:restore-test" "$crontab_file" 2>/dev/null; then
    echo "$restore_cron" >> "$crontab_file"
    installed=$((installed + 1))
    echo "  ✓ Restore test: weekly (Saturday @ 03:00)"
  fi
  
  # Check and add health job
  if [ "$HEALTH_ENABLED" = "true" ]; then
    local health_cron=$(generate_health_cron)
    if ! grep -q "ops:health-report" "$crontab_file" 2>/dev/null; then
      echo "$health_cron" >> "$crontab_file"
      installed=$((installed + 1))
      echo "  ✓ Health report: every 4 hours (6am+)"
    fi
  fi
  
  # Install crontab
  if [ $installed -gt 0 ]; then
    crontab "$crontab_file"
    echo "[ops-scheduler] ✅ $installed cron job(s) installed"
  else
    echo "[ops-scheduler] ⚠ All jobs already exist (skipped)"
  fi
  
  rm -f "$crontab_file"
}

# Uninstall cron jobs
uninstall_crons() {
  echo "[ops-scheduler] Removing cron jobs for apiflow-ops..."
  
  local crontab_file="/tmp/apiflow-ops-crontab.$$"
  crontab -l > "$crontab_file" 2>/dev/null || true
  
  # Remove apiflow-related lines
  grep -v "apiflow-ops\|ops:backup\|ops:restore-test\|ops:health-report" "$crontab_file" > "${crontab_file}.new" || true
  
  if [ -s "${crontab_file}.new" ]; then
    crontab "${crontab_file}.new"
  else
    crontab -r 2>/dev/null || echo "[ops-scheduler] No existing crontab to clean"
  fi
  
  rm -f "$crontab_file" "${crontab_file}.new"
  echo "[ops-scheduler] ✅ Cron jobs removed"
}

# List installed jobs
list_crons() {
  echo "[ops-scheduler] Installed apiflow-ops cron jobs:"
  crontab -l 2>/dev/null | grep -E "ops:backup|ops:restore-test|ops:health-report" || echo "  (none found)"
}

# Main
case "${1:-install}" in
  install)
    install_crons
    ;;
  uninstall)
    uninstall_crons
    ;;
  list)
    list_crons
    ;;
  *)
    echo "Usage: $0 {install|uninstall|list}"
    echo ""
    echo "Commands:"
    echo "  install   - Register ops cron jobs (from config/.ops-config.json)"
    echo "  uninstall - Remove all ops cron jobs"
    echo "  list      - Show installed apiflow-ops cron jobs"
    exit 1
    ;;
esac
