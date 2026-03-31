param(
  [switch]$RegisterTasks,
  [switch]$UnregisterTasks,
  [switch]$ListTasks,
  [switch]$Help,
  [switch]$Debug
)

$ErrorActionPreference = 'Stop'

# Path resolution
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentDir = Split-Path -Parent $scriptDir
$repoRoot = if (Test-Path (Join-Path $parentDir 'config\.ops-config.json')) {
  $parentDir
} else {
  Split-Path -Parent $parentDir
}

$configFile = Join-Path $repoRoot 'config\.ops-config.json'
$schedulerDir = Join-Path (Split-Path -Parent $scriptDir) 'scheduler'

function Read-OpsConfig {
  if ($Debug) {
    Write-Host "[DEBUG] Script dir: $scriptDir" -ForegroundColor Gray
    Write-Host "[DEBUG] Repo root: $repoRoot" -ForegroundColor Gray
    Write-Host "[DEBUG] Config file: $configFile" -ForegroundColor Gray
  }
  
  if (-not (Test-Path $configFile)) {
    throw "[ERROR] Config file not found: $configFile"
  }
  
  $json = Get-Content $configFile -Raw | ConvertFrom-Json
  return $json
}

function List-OpsTasks {
  Write-Host "[ops-setup] Installed apiflow-ops scheduled tasks:" -ForegroundColor Cyan
  
  $tasks = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like "*ops*" }
  
  if ($tasks) {
    foreach ($task in $tasks) {
      $enabled = if ($task.Settings.Enabled) { "ENABLED" } else { "DISABLED" }
      Write-Host "  [$enabled] $($task.TaskName)" -ForegroundColor Cyan
    }
  } else {
    Write-Host "  (no tasks found)" -ForegroundColor Gray
  }
}

function Register-OpsTask {
  param(
    [string]$TaskName,
    [string]$XmlFile
  )
  
  if (-not (Test-Path $XmlFile)) {
    throw "Task XML file not found: $XmlFile"
  }
  
  Write-Host "[ops-setup] Registering $TaskName..." -ForegroundColor Cyan
  
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "  (already exists, skipping)" -ForegroundColor Yellow
    return
  }
  
  Register-ScheduledTask -Xml (Get-Content $XmlFile -Raw) -TaskName $TaskName -Force | Out-Null
  Write-Host "  DONE" -ForegroundColor Green
}

function Unregister-OpsTask {
  param(
    [string]$TaskName
  )
  
  Write-Host "[ops-setup] Unregistering $TaskName..." -ForegroundColor Yellow
  
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
    Write-Host "  DONE" -ForegroundColor Green
  } else {
    Write-Host "  (not found)" -ForegroundColor Gray
  }
}

function Show-Help {
  Write-Host @"
ops-setup.ps1 - Windows Task Scheduler automation

Usage:
  .\ops-setup.ps1 -ListTasks              Show installed tasks
  .\ops-setup.ps1 -RegisterTasks          Register all scheduled tasks
  .\ops-setup.ps1 -UnregisterTasks        Unregister all scheduled tasks
  .\ops-setup.ps1 -Help                   Show this message
  .\ops-setup.ps1 -Debug -ListTasks       Debug mode

Tasks:
  ops-backup-daily              Daily backup @ 02:00
  ops-restore-test-weekly       Weekly Saturday @ 03:00
  ops-health-report-periodic    Every 4 hours

Note: RegisterTasks requires admin privileges.

"@
}

# Main
if ($Help) {
  Show-Help
  exit 0
}

if (-not $RegisterTasks -and -not $UnregisterTasks -and -not $ListTasks) {
  Show-Help
  exit 0
}

$config = Read-OpsConfig
Write-Host "[ops-setup] Project: $($config.project.name)" -ForegroundColor Gray

if ($ListTasks) {
  List-OpsTasks
  exit 0
}

if ($RegisterTasks) {
  Write-Host "[ops-setup] Installing scheduled tasks..." -ForegroundColor Cyan
  Write-Host ""
  
  Register-OpsTask -TaskName "ops-backup-daily" -XmlFile (Join-Path $schedulerDir "ops-backup-daily.xml")
  Register-OpsTask -TaskName "ops-restore-test-weekly" -XmlFile (Join-Path $schedulerDir "ops-restore-test-weekly.xml")
  Register-OpsTask -TaskName "ops-health-report-periodic" -XmlFile (Join-Path $schedulerDir "ops-health-report-periodic.xml")
  
  Write-Host ""
  Write-Host "[ops-setup] All tasks registered" -ForegroundColor Green
  exit 0
}

if ($UnregisterTasks) {
  Write-Host "[ops-setup] Removing scheduled tasks..." -ForegroundColor Yellow
  Write-Host ""
  
  Unregister-OpsTask -TaskName "ops-backup-daily"
  Unregister-OpsTask -TaskName "ops-restore-test-weekly"
  Unregister-OpsTask -TaskName "ops-health-report-periodic"
  
  Write-Host ""
  Write-Host "[ops-setup] All tasks unregistered" -ForegroundColor Green
  exit 0
}
