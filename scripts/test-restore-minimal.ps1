Write-Host 'Test started'
$repoRoot = Split-Path -Parent $PSScriptRoot
$BackupRoot = Join-Path $repoRoot 'output/shared/checkpoints'
Write-Host 'BackupRoot: ' $BackupRoot
$latest = Get-ChildItem -Path $BackupRoot -File -Filter 'checkpoint-*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latest) {
  Write-Host 'Found: ' $latest.Name
} else {
  Write-Host 'Not found'
}
