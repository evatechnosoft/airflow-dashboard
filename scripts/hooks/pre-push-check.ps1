Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host '[hook:pre-push] running orchestrator tests...' -ForegroundColor Cyan
pwsh -NoProfile -File scripts/tests/test-auto-agent.ps1

Write-Host '[hook:pre-push] OK' -ForegroundColor Green
