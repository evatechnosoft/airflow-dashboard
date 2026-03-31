param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Command
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$helpDir = Join-Path $root 'docs/help'

$map = @{
  '/help-me' = 'help-me.md'
  '/help-git' = 'help-git.md'
  '/help-hooks' = 'help-hooks.md'
  '/help-agent' = 'help-agent.md'
  '/help-deploy' = 'help-deploy.md'
  '/help-ops' = 'help-ops.md'
}

if (-not $map.ContainsKey($Command)) {
  Write-Host "Unknown command: $Command" -ForegroundColor Yellow
  Write-Host "Available: $($map.Keys -join ', ')"
  exit 1
}

$filePath = Join-Path $helpDir $map[$Command]
if (-not (Test-Path $filePath)) {
  Write-Host "Help file missing: $filePath" -ForegroundColor Red
  exit 1
}

Get-Content $filePath
