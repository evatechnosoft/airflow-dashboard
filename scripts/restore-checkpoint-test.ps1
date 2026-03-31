param(
  [string]$CheckpointFile = '',
  [string]$BackupRoot = '',
  [switch]$KeepExtracted
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $BackupRoot) {
  $BackupRoot = Join-Path $repoRoot 'output/shared/checkpoints'
}

if (-not (Test-Path $BackupRoot)) {
  throw 'Backup folder not found: ' + $BackupRoot
}

if (-not $CheckpointFile) {
  $latest = Get-ChildItem -Path $BackupRoot -File -Filter 'checkpoint-*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) {
    Write-Host '[restore-checkpoint-test] folder contents:' -ForegroundColor Yellow
    Get-ChildItem -Path $BackupRoot | Format-Table Name, Length, LastWriteTime
    throw 'No checkpoint zip found. Run ops:backup first.'
  }
  $CheckpointFile = $latest.FullName
}

Write-Host '[ops:restore-test] using ' $CheckpointFile -ForegroundColor Cyan
$extractDir = Join-Path $env:TEMP ('checkpoint-restore-test-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null
Write-Host '[ops:restore-test] extracting to ' $extractDir -ForegroundColor Gray

Expand-Archive -Path $CheckpointFile -DestinationPath $extractDir -Force

$manifestPath = Join-Path $extractDir 'manifest.json'
if (-not (Test-Path $manifestPath)) {
  throw 'Restore test failed: manifest.json missing in checkpoint'
}

$manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.included) {
  throw 'Restore test failed: manifest missing included entries'
}

Write-Host '[ops:restore-test] manifest has ' $manifest.included.Count ' entries' -ForegroundColor Cyan

$warnings = @()
foreach ($file in @('settings.json', 'targets.json', '.gitignore')) {
  $full = Join-Path $extractDir $file
  if (-not (Test-Path $full)) {
    $warnings += $file
  }
}

if ($warnings.Count -gt 0) {
  Write-Host '[ops:restore-test] optional files missing: ' + ($warnings -join ', ') -ForegroundColor Yellow
}

Write-Host '[ops:restore-test] ✓ PASS' -ForegroundColor Green

if (-not $KeepExtracted) {
  Remove-Item -Path $extractDir -Recurse -Force
}
