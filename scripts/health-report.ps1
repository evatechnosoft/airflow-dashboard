param(
  [string]$LocalUrl = 'http://127.0.0.1:9201/healthz',
  [string]$TestUrl = 'http://192.168.1.186:9308/healthz',
  [string]$ProdUrl = 'http://192.168.1.186:9309/healthz',
  [string]$BackupRoot = '',
  [string]$OutFile = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $BackupRoot) {
  $BackupRoot = Join-Path $repoRoot 'output/shared/checkpoints'
}
# Normalize path for consistency
$BackupRoot = [System.IO.Path]::GetFullPath($BackupRoot)

if (-not $OutFile) {
  $OutFile = Join-Path $repoRoot 'output/results/ops-health-latest.json'
}

# Normalize output path
$OutFile = [System.IO.Path]::GetFullPath($OutFile)

function Test-Endpoint([string]$url) {
  $result = [ordered]@{
    url = $url
    ok = $false
    status = $null
    latencyMs = $null
    error = $null
  }

  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    $sw.Stop()
    $result.ok = ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400)
    $result.status = $resp.StatusCode
    $result.latencyMs = [int]$sw.ElapsedMilliseconds
  }
  catch {
    $result.error = $_.Exception.Message
  }

  return $result
}

$branch = ''
$dirtyCount = 0
try {
  $branch = (git branch --show-current).Trim()
  $dirty = git status --porcelain
  if ($dirty) {
    $dirtyCount = @($dirty).Count
  }
}
catch {
  $branch = 'unknown'
}

$latestBackup = $null
$backupAgeHours = $null
if (Test-Path $BackupRoot) {
  # Use -File flag and -Filter for reliable pattern matching
  $latestBackup = Get-ChildItem -Path $BackupRoot -File -Filter 'checkpoint-*.zip' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latestBackup) {
    $backupAgeHours = [math]::Round(((Get-Date) - $latestBackup.LastWriteTime).TotalHours, 2)
  }
}

$endpoints = @(
  (Test-Endpoint $LocalUrl),
  (Test-Endpoint $TestUrl),
  (Test-Endpoint $ProdUrl)
)

$localOk = ($endpoints[0].ok -eq $true)
$backupFresh = ($backupAgeHours -ne $null -and $backupAgeHours -le 24)

$overall = 'warn'
if ($localOk -and $backupFresh) {
  $overall = 'ok'
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  overall = $overall
  git = @{
    branch = $branch
    dirtyCount = $dirtyCount
  }
  backup = @{
    root = $BackupRoot
    latestFile = $(if ($latestBackup) { $latestBackup.FullName } else { $null })
    ageHours = $backupAgeHours
    fresh24h = $backupFresh
  }
  endpoints = $endpoints
}

$parent = Split-Path -Parent $OutFile
New-Item -ItemType Directory -Path $parent -Force | Out-Null
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $OutFile -Encoding UTF8

Write-Host '[ops:health-report] completed' -ForegroundColor Green
Write-Host ("overall=" + $overall)
Write-Host ("report=" + $OutFile)
