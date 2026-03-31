param(
  [Parameter(Mandatory = $true)]
  [string]$Task,
  [switch]$AsJson
)

$scriptPath = Join-Path $PSScriptRoot 'auto-agent.ps1'

if ($AsJson) {
  & $scriptPath -Task $Task -AsJson
} else {
  & $scriptPath -Task $Task
}
