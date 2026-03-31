# /help-git

## Gunluk Akis
- Durum: `git status --short`
- Branch: `git branch --show-current`
- Commit: `git add -A && git commit -m "type(scope): message"`
- Push: `git push origin test`

## Hook Aktivasyon
- `pwsh -NoProfile -File scripts/setup-hooks.ps1`

## Not
- Bu repoda `origin` HTTPS olarak ayarli.
- Pre-push hook, otomasyon testlerini calistirir.
