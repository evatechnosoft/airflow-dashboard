$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'auto-agent.ps1'

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) {
    throw "ASSERT FAILED: $message"
  }
}

# Test 1: Deploy + production should be medium risk and include deploy skill
$t1 = & $scriptPath -Task 'prod deploy et ve server restart yap' -AsJson | ConvertFrom-Json
Assert-True ($t1.risk -eq 'medium') 'risk should be medium for deploy/restart'
Assert-True ($t1.skills -contains 'azure-deploy') 'azure-deploy skill should be selected'

# Test 2: Destructive command should be high risk
$t2 = & $scriptPath -Task 'rm -rf ve force push yap' -AsJson | ConvertFrom-Json
Assert-True ($t2.risk -eq 'high') 'risk should be high for destructive patterns'
Assert-True ($t2.approval -eq 'explicit-confirm-required') 'approval policy mismatch for high risk'

# Test 3: Multi-task sentence should trigger subagent
$t3 = & $scriptPath -Task 'api debug et, deploy plani cikar ve test coverage arttir' -AsJson | ConvertFrom-Json
Assert-True ($t3.useSubagent -eq $true) 'multi-task request should enable subagent'

# Test 4: Agent mapping for data tasks
$t4 = & $scriptPath -Task 'csv data analiz et ve trend cikar' -AsJson | ConvertFrom-Json
Assert-True ($t4.preferredAgent -eq 'DataAnalysisExpert') 'expected DataAnalysisExpert agent for data tasks'

Write-Output 'ALL_TESTS_PASSED'
