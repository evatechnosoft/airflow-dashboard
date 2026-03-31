Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$patterns = @(
  'AKIA[0-9A-Z]{16}',
  '-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----',
  'ghp_[A-Za-z0-9]{30,}',
  'AIza[0-9A-Za-z\-_]{35}'
)

$changed = git diff --cached --name-only
if (-not $changed) {
  exit 0
}

$violations = @()
foreach ($file in $changed) {
  if (-not (Test-Path $file)) { continue }
  $content = Get-Content $file -Raw
  foreach ($p in $patterns) {
    if ($content -match $p) {
      $violations += "${file}: pattern=${p}"
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host '[hook:pre-commit] potential secret detected:' -ForegroundColor Red
  $violations | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host '[hook:pre-commit] no secret pattern found' -ForegroundColor Green
