Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

git config core.hooksPath .githooks
Write-Host 'core.hooksPath set to .githooks' -ForegroundColor Green

$hooks = @('.githooks/pre-commit', '.githooks/pre-push', '.githooks/post-merge')
foreach ($h in $hooks) {
  if (Test-Path $h) {
    Write-Host "hook ready: $h" -ForegroundColor Cyan
  } else {
    Write-Host "hook missing: $h" -ForegroundColor Red
    exit 1
  }
}

Write-Host 'Hook setup completed.' -ForegroundColor Green
