Write-Host '[hook:post-merge] Merge tamamlandi. Onerilen adimlar:' -ForegroundColor Yellow
Write-Host '1) docker-compose up -d'
Write-Host '2) pwsh -NoProfile -File scripts/tests/test-auto-agent.ps1'
Write-Host '3) pwsh -NoProfile -File scripts/help-router.ps1 /help-me'
