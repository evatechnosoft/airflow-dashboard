# /help-hooks

## Kurulum
- `pwsh -NoProfile -File scripts/setup-hooks.ps1`

## Aktif Hooklar
- `pre-commit`: basit secret pattern taramasi
- `pre-push`: `scripts/tests/test-auto-agent.ps1` calistirir
- `post-merge`: sonraki adim hatirlatmasi

## Manuel Test
- `pwsh -NoProfile -File scripts/hooks/pre-push-check.ps1`
- `pwsh -NoProfile -File scripts/hooks/pre-commit-secret-scan.ps1`
