param(
  [string]$ApiHealthUrl = "http://127.0.0.1:9201/healthz"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$opsHealthScript = Join-Path $scriptDir "health-report.ps1"
$workspaceFile = Join-Path $projectRoot "apiflow-monitor-plus-ops.code-workspace"

function Write-Step {
  param([string]$Message)
  Write-Host "[health-all] $Message"
}

try {
  Write-Step "Checking API health endpoint: $ApiHealthUrl"
  $apiResponse = Invoke-WebRequest -Uri $ApiHealthUrl -TimeoutSec 8 -UseBasicParsing
  if ($apiResponse.StatusCode -lt 200 -or $apiResponse.StatusCode -ge 300) {
    throw "API health returned unexpected status code: $($apiResponse.StatusCode)"
  }
  Write-Step "API health OK ($($apiResponse.StatusCode))"

  Write-Step "Running ops health report"
  & pwsh -NoProfile -File $opsHealthScript
  if ($LASTEXITCODE -ne 0) {
    throw "ops health report script failed with exit code: $LASTEXITCODE"
  }

  if (Test-Path $workspaceFile) {
    Write-Step "Workspace file found: $workspaceFile"
  } else {
    Write-Step "Workspace file missing: $workspaceFile"
  }

  $reportPath = Join-Path $projectRoot "output/results/ops-health-latest.json"
  if (Test-Path $reportPath) {
    Write-Step "Report generated: $reportPath"
  } else {
    throw "Expected report not found: $reportPath"
  }

  Write-Step "ALL CHECKS PASSED"
  exit 0
}
catch {
  Write-Error "health-check-all failed: $($_.Exception.Message)"
  exit 1
}
