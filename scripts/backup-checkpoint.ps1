param(
  [string]$BackupRoot = '',
  [string[]]$IncludePaths = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $BackupRoot) {
  $BackupRoot = Join-Path $repoRoot 'output/shared/checkpoints'
}
# Normalize path for consistency across script invocations
$BackupRoot = [System.IO.Path]::GetFullPath($BackupRoot)

$userHome = [Environment]::GetFolderPath('UserProfile')
if ($IncludePaths.Count -eq 0) {
  $IncludePaths = @(
    (Join-Path $userHome '.claude'),
    (Join-Path $userHome '.copilot'),
    (Join-Path $userHome 'AppData/Roaming/Code/User/settings.json'),
    (Join-Path $userHome 'AppData/Roaming/Code/User/keybindings.json'),
    (Join-Path $repoRoot 'targets.json'),
    (Join-Path $repoRoot '.gitignore')
  )
}

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stageDir = Join-Path $env:TEMP ("checkpoint-stage-" + $stamp)
$zipPath = Join-Path $BackupRoot ("checkpoint-" + $stamp + '.zip')

if (Test-Path $stageDir) {
  Remove-Item -Path $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

$manifest = [ordered]@{
  createdAt = (Get-Date).ToString('o')
  host = $env:COMPUTERNAME
  repoRoot = $repoRoot
  included = @()
}

foreach ($path in $IncludePaths) {
  if (-not (Test-Path $path)) {
    continue
  }

  $leaf = Split-Path -Leaf $path
  $dest = Join-Path $stageDir $leaf

  if ((Get-Item $path).PSIsContainer) {
    Copy-Item -Path $path -Destination $dest -Recurse -Force
    $manifest.included += @{
      path = $path
      type = 'directory'
    }
  } else {
    Copy-Item -Path $path -Destination $dest -Force
    $manifest.included += @{
      path = $path
      type = 'file'
    }
  }
}

$manifestPath = Join-Path $stageDir 'manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item -Path $zipPath -Force
}

# Use explicit file collection for reliable archiving across all platforms
$archiveItems = Get-ChildItem -Path $stageDir -Force
Compress-Archive -Path @($archiveItems.FullName) -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -Path $stageDir -Recurse -Force

Write-Host '[ops:backup] checkpoint created:' -ForegroundColor Green
Write-Host $zipPath
