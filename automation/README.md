# Task Orchestrator Automation

Bu modul, gelen gorev metninden otomatik olarak:
- skill secimi,
- risk/approval seviyesi,
- uygun uzman ajan,
- subagent gereksinimi
uretmek icin tasarlandi.

## Dosyalar
- `orchestrator-config.json`: temel ayarlar ve fallback
- `skill-routing.json`: domain->skill ve ajan esleme kurallari
- `policy.json`: risk ve subagent politikasi
- `../scripts/auto-agent.ps1`: ana karar motoru
- `../scripts/plan-task.ps1`: hizli wrapper

## Kullanım
```powershell
pwsh -File scripts/plan-task.ps1 -Task "prod deploy et ve test yaz"
pwsh -File scripts/plan-task.ps1 -Task "csv data analiz et" -AsJson
```

## Test
```powershell
pwsh -NoProfile -File scripts/tests/test-auto-agent.ps1
```

## Not
Bu mekanizma once plan/yonlendirme yapar. Uygulama adimlari daha sonra secilen skill/ajan akisina gore calistirilir.
