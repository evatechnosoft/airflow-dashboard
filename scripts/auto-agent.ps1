param(
  [Parameter(Mandatory = $true)]
  [string]$Task,
  [string]$ConfigRoot = "",
  [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ConfigPath([string]$root, [string]$name) {
  if ($root -and (Test-Path $root)) {
    return Join-Path $root $name
  }
  $base = Split-Path -Parent $PSScriptRoot
  return Join-Path (Join-Path $base "automation") $name
}

function Count-IndependentTasks([string]$text, [object]$rules) {
  $count = 1
  foreach ($sep in $rules.separatorHints) {
    if ($text.ToLowerInvariant().Contains($sep.ToLowerInvariant())) {
      $count += 1
    }
  }
  return $count
}

function Get-Risk([string]$text, [object]$riskRules) {
  $lower = $text.ToLowerInvariant()
  foreach ($p in $riskRules.high) {
    if ($lower.Contains([string]$p)) { return "high" }
  }
  foreach ($p in $riskRules.medium) {
    if ($lower.Contains([string]$p)) { return "medium" }
  }
  return "low"
}

$cfgPath = Get-ConfigPath $ConfigRoot "orchestrator-config.json"
$routePath = Get-ConfigPath $ConfigRoot "skill-routing.json"
$policyPath = Get-ConfigPath $ConfigRoot "policy.json"

$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$routes = Get-Content $routePath -Raw | ConvertFrom-Json
$policy = Get-Content $policyPath -Raw | ConvertFrom-Json

$taskLower = $Task.ToLowerInvariant()
$selectedSkills = [System.Collections.Generic.HashSet[string]]::new()
$domains = New-Object System.Collections.Generic.List[string]
$reasons = New-Object System.Collections.Generic.List[string]

foreach ($skill in $routes.defaultSkills) {
  [void]$selectedSkills.Add([string]$skill)
}

foreach ($route in $routes.routes) {
  $matched = $false
  foreach ($kw in $route.keywords) {
    if ($taskLower.Contains(([string]$kw).ToLowerInvariant())) {
      $matched = $true
      break
    }
  }

  if ($matched) {
    [void]$domains.Add([string]$route.domain)
    foreach ($skill in $route.skills) {
      [void]$selectedSkills.Add([string]$skill)
    }
    [void]$reasons.Add("domain=" + [string]$route.domain)
  }
}

$agent = [string]$cfg.fallback.agent
foreach ($sel in $routes.agentSelection) {
  $matchCount = 0
  foreach ($kw in $sel.whenKeywords) {
    if ($taskLower.Contains(([string]$kw).ToLowerInvariant())) {
      $matchCount += 1
    }
  }
  if ($matchCount -gt 0) {
    $agent = [string]$sel.agentName
    [void]$reasons.Add("agent=" + [string]$sel.agentName)
    break
  }
}

$risk = Get-Risk $Task $policy.riskRules
$approval = [string]$policy.approvalPolicy.$risk

$independentTasks = Count-IndependentTasks $Task $policy.subagentRules
$complexityMatches = 0
foreach ($kw in $policy.subagentRules.complexityKeywords) {
  if ($taskLower.Contains(([string]$kw).ToLowerInvariant())) {
    $complexityMatches += 1
  }
}

$useSubagent = ($independentTasks -ge [int]$policy.subagentRules.minIndependentTasks) -or ($complexityMatches -ge [int]$policy.subagentRules.minComplexityMatches)

$result = [ordered]@{
  task = $Task
  risk = $risk
  approval = $approval
  domains = @($domains)
  skills = @($selectedSkills)
  preferredAgent = $agent
  useSubagent = $useSubagent
  independentTaskEstimate = $independentTasks
  complexityMatches = $complexityMatches
  reasons = @($reasons)
}

if ($AsJson) {
  $result | ConvertTo-Json -Depth 5
} else {
  "Task: $($result.task)"
  "Risk: $($result.risk)"
  "Approval: $($result.approval)"
  "Domains: $([string]::Join(', ', $result.domains))"
  "Skills: $([string]::Join(', ', $result.skills))"
  "PreferredAgent: $($result.preferredAgent)"
  "UseSubagent: $($result.useSubagent)"
  "IndependentTaskEstimate: $($result.independentTaskEstimate)"
  "ComplexityMatches: $($result.complexityMatches)"
}